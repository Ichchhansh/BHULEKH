import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from models import Application, ApplicationStage, AuditEvent

STAGE_SLA_CONFIG = {
    0: {
        "name": "Revenue Record & Jamabandi Verification",
        "department": "Revenue Department (Tehsil Office)",
        "role": "REVENUE_OFFICER",
        "sla_days": 7,
        "description": "Verification of Khasra/Khatauni ownership entries, area measurement, and ancestral mutation records."
    },
    1: {
        "name": "Cadastral Boundary & GIS Survey Verification",
        "department": "Department of Land Records & Survey",
        "role": "SURVEY_OFFICER",
        "sla_days": 5,
        "description": "Satellite & DGPS geo-coordinate validation, boundary overlap inspection, and encroachment screening."
    },
    2: {
        "name": "e-Courts Litigation & CERSAI Encumbrance Check",
        "department": "Legal Affairs & Dispute Settlement",
        "role": "LEGAL_OFFICER",
        "sla_days": 3,
        "description": "Comprehensive scan of pending civil court cases, revenue court injunctions, and bank mortgage charges."
    },
    3: {
        "name": "Sub-Registrar Registered Deed & Stamp Audit",
        "department": "Registration & Stamps Department (SRO)",
        "role": "REGISTRATION_OFFICER",
        "sla_days": 4,
        "description": "Verification of registered sale/gift deed, circle-rate valuation computation, and e-Stamping receipt validation."
    },
    4: {
        "name": "Final Statutory Mutation Order & Ledger Minting",
        "department": "District Administration (SDM / Collectorate)",
        "role": "SDM_APPROVER",
        "sla_days": 2,
        "description": "Executive review of all statutory clearances, signing mutation order, and minting sovereign blockchain block."
    }
}

REJECTION_CATEGORIES = [
    "Ownership mismatch with revenue record",
    "Missing statutory document",
    "Invalid or unverified registered deed",
    "Identity verification (e-KYC) mismatch",
    "Active court dispute / Stay order pending",
    "Undisclosed bank mortgage or financial encumbrance",
    "Cadastral boundary overlap or encroachment",
    "Parcel area discrepancy exceeding permissible margin",
    "Duplicate or concurrent transaction in progress",
    "Legal restriction / Scheduled tribe land non-transferability",
    "Other administrative or technical grounds"
]

def calculate_sla_status(deadline_at: datetime.datetime, completed_at: datetime.datetime = None) -> Dict[str, Any]:
    """
    Computes SLA health, remaining days/hours, and breach state.
    """
    now = datetime.datetime.utcnow()
    
    if completed_at:
        was_delayed = completed_at > deadline_at
        return {
            "status": "COMPLETED_DELAYED" if was_delayed else "COMPLETED_ON_TIME",
            "is_breached": was_delayed,
            "time_remaining_str": "Completed",
            "hours_remaining": 0,
            "delay_hours": max(0, int((completed_at - deadline_at).total_seconds() / 3600)) if was_delayed else 0
        }
    
    diff = deadline_at - now
    total_seconds = diff.total_seconds()
    
    if total_seconds < 0:
        overdue_hours = abs(int(total_seconds / 3600))
        overdue_days = overdue_hours // 24
        remaining_hours = overdue_hours % 24
        return {
            "status": "SLA_BREACHED",
            "is_breached": True,
            "time_remaining_str": f"Overdue by {overdue_days}d {remaining_hours}h",
            "hours_remaining": 0,
            "delay_hours": overdue_hours
        }
    else:
        hours = int(total_seconds / 3600)
        days = hours // 24
        rem_hours = hours % 24
        
        # If less than 24 hours left, mark as approaching
        status = "SLA_APPROACHING" if hours < 24 else "ON_TRACK"
        return {
            "status": status,
            "is_breached": False,
            "time_remaining_str": f"{days}d {rem_hours}h remaining",
            "hours_remaining": hours,
            "delay_hours": 0
        }

def evaluate_and_update_application_slas(db: Session) -> int:
    """
    Scans active applications and updates SLA breach statuses.
    Creates immutable audit logs and notifies supervisory escalation queue if breached.
    """
    active_apps = db.query(Application).filter(
        Application.status.in_(["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED"])
    ).all()

    now = datetime.datetime.utcnow()
    breach_count = 0

    for app in active_apps:
        # Check current active stage
        current_stage = next((s for s in app.stages if s.stage_order == app.current_stage_index), None)
        if current_stage and current_stage.status in ["PENDING", "IN_PROGRESS"]:
            if now > current_stage.deadline_at:
                if current_stage.status != "SLA_BREACHED":
                    current_stage.status = "SLA_BREACHED"
                    app.is_sla_breached = True
                    app.supervisor_notified = True
                    app.sla_breach_notified_at = now
                    breach_count += 1
                    
                    # Log Audit Event
                    audit = AuditEvent(
                        entity_type="SLA",
                        entity_id=app.id,
                        actor_name="GovLand Automated SLA Monitor",
                        actor_role="SYSTEM_DAEMON",
                        action="SLA_BREACH_ESCALATION",
                        details=(
                            f"Stage '{current_stage.stage_name}' (Assigned to {current_stage.assigned_officer_name or current_stage.assigned_role}) "
                            f"exceeded deadline of {current_stage.deadline_at.strftime('%d %b %Y %H:%M UTC')}. "
                            f"Automated breach notice dispatched to District Collector supervisory dashboard."
                        )
                    )
                    db.add(audit)

    db.commit()
    return breach_count
