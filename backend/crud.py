import datetime
import json
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from models import (
    User, Parcel, OwnershipHistory, Application, ApplicationStage,
    Document, AuditEvent, LedgerBlock
)
from schemas import (
    ApplicationCreateRequest, OfficerActionRequest,
    CitizenCorrectionRequest, CitizenAppealRequest, PropertyListingToggleRequest
)
from ledger import BhulekhLedgerEngine, create_digital_signature, calculate_sha256
from sla_engine import STAGE_SLA_CONFIG, calculate_sla_status

def format_indian_currency(lakhs: float) -> str:
    """Formats amount in Indian Lakhs or Crores format."""
    if lakhs >= 100.0:
        crores = lakhs / 100.0
        return f"₹{crores:.2f} Crores"
    else:
        return f"₹{lakhs:.2f} Lakhs"

def get_parcels(
    db: Session,
    state: Optional[str] = None,
    district: Optional[str] = None,
    tehsil: Optional[str] = None,
    village: Optional[str] = None,
    land_use: Optional[str] = None,
    is_for_sale: Optional[bool] = None,
    is_disputed: Optional[bool] = None,
    search: Optional[str] = None,
    owner_id: Optional[str] = None
) -> List[Parcel]:
    query = db.query(Parcel)
    if owner_id:
        query = query.filter(Parcel.current_owner_id == owner_id)
    if state:
        query = query.filter(Parcel.state.ilike(f"%{state}%"))
    if district:
        query = query.filter(Parcel.district.ilike(f"%{district}%"))
    if tehsil:
        query = query.filter(Parcel.tehsil.ilike(f"%{tehsil}%"))
    if village:
        query = query.filter(Parcel.village.ilike(f"%{village}%"))
    if land_use:
        query = query.filter(Parcel.land_use == land_use)
    if is_for_sale is not None:
        query = query.filter(Parcel.is_for_sale == is_for_sale)
    if is_disputed is not None:
        query = query.filter(Parcel.is_disputed == is_disputed)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Parcel.id.ilike(s),
                Parcel.ulin_pin.ilike(s),
                Parcel.khasra_no.ilike(s),
                Parcel.khata_no.ilike(s),
                Parcel.village.ilike(s),
                Parcel.district.ilike(s),
                Parcel.state.ilike(s)
            )
        )
    return query.all()

def get_parcel_by_id(db: Session, parcel_id: str) -> Optional[Parcel]:
    return db.query(Parcel).filter(Parcel.id == parcel_id).first()

def toggle_property_listing(db: Session, parcel_id: str, req: PropertyListingToggleRequest, actor_name: str) -> Optional[Parcel]:
    parcel = get_parcel_by_id(db, parcel_id)
    if not parcel:
        return None
    parcel.is_for_sale = req.is_for_sale
    parcel.listing_price_lakhs = req.listing_price_lakhs if req.is_for_sale else None
    
    price_str = format_indian_currency(req.listing_price_lakhs or 0)
    audit = AuditEvent(
        entity_type="PARCEL",
        entity_id=parcel_id,
        actor_name=actor_name,
        actor_role="CITIZEN_OWNER",
        action="PROPERTY_LISTING_TOGGLE",
        details=f"Citizen updated sale listing to {'AVAILABLE_FOR_SALE' if req.is_for_sale else 'NOT_FOR_SALE'} with indicated price {price_str}."
    )
    db.add(audit)
    db.commit()
    db.refresh(parcel)
    return parcel

def create_application(db: Session, applicant_id: str, req: ApplicationCreateRequest) -> Application:
    parcel = get_parcel_by_id(db, req.parcel_id)
    applicant = db.query(User).filter(User.id == applicant_id).first()
    
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    app_id = f"APP-{now.strftime('%Y')}-{parcel.district[:3].upper()}-{str(db.query(Application).count() + 101).zfill(4)}"
    
    total_sla_days = sum(cfg["sla_days"] for cfg in STAGE_SLA_CONFIG.values())
    overall_deadline = now + datetime.timedelta(days=total_sla_days)
    
    app = Application(
        id=app_id,
        parcel_id=req.parcel_id,
        applicant_id=applicant_id,
        buyer_name=req.buyer_name,
        buyer_masked_aadhaar=req.buyer_masked_aadhaar,
        buyer_phone_masked=req.buyer_phone_masked,
        transfer_type=req.transfer_type,
        declared_value_lakhs=req.declared_value_lakhs,
        stamp_duty_paid_lakhs=req.stamp_duty_paid_lakhs,
        current_stage_index=0,
        status="UNDER_REVIEW",
        created_at=now,
        updated_at=now,
        sla_deadline=overall_deadline,
        is_sla_breached=False,
        supervisor_notified=False
    )
    db.add(app)
    db.flush()

    cumulative_days = 0
    for idx, cfg in STAGE_SLA_CONFIG.items():
        stage_assigned_at = now if idx == 0 else (now + datetime.timedelta(days=cumulative_days))
        cumulative_days += cfg["sla_days"]
        stage_deadline = stage_assigned_at + datetime.timedelta(days=cfg["sla_days"])
        
        stage = ApplicationStage(
            application_id=app_id,
            stage_order=idx,
            stage_name=cfg["name"],
            department=cfg["department"],
            assigned_role=cfg["role"],
            assigned_officer_id=f"OFF_{cfg['role'][:3].lower()}_01",
            assigned_officer_name=f"Officer ({cfg['role'].replace('_', ' ').title()})",
            status="IN_PROGRESS" if idx == 0 else "PENDING",
            sla_days=cfg["sla_days"],
            assigned_at=stage_assigned_at,
            deadline_at=stage_deadline
        )
        db.add(stage)

    doc_index = 1
    for d in req.documents:
        doc_hash = d.get("sha256_hash") or calculate_sha256(f"{d.get('file_name', 'deed.pdf')}:{now.isoformat()}")
        doc = Document(
            id=f"DOC-{app_id[-4:]}-{doc_index}",
            application_id=app_id,
            parcel_id=req.parcel_id,
            doc_type=d.get("doc_type", "SALE_DEED"),
            title=d.get("title", "Registered Conveyance Deed"),
            file_name=d.get("file_name", "registered_deed.pdf"),
            file_size_kb=d.get("file_size_kb", 420.0),
            sha256_hash=doc_hash,
            verification_status="VERIFIED",
            uploaded_by=applicant.full_name if applicant else "Citizen",
            uploaded_at=now
        )
        db.add(doc)
        doc_index += 1

    dec_val_str = format_indian_currency(req.declared_value_lakhs)
    audit = AuditEvent(
        entity_type="APPLICATION",
        entity_id=app_id,
        actor_name=applicant.full_name if applicant else "Citizen",
        actor_role="CITIZEN",
        action="APPLICATION_SUBMITTED",
        details=f"Submitted ownership transfer mutation for Parcel '{req.parcel_id}' in favor of '{req.buyer_name}'. Declared Value: {dec_val_str}."
    )
    db.add(audit)
    db.commit()
    db.refresh(app)
    return app

def process_officer_action(
    db: Session,
    application_id: str,
    req: OfficerActionRequest
) -> Application:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise ValueError("Application not found")
    
    current_stage = next((s for s in app.stages if s.stage_order == app.current_stage_index), None)
    if not current_stage:
        raise ValueError("Current stage not found")
    
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    now_iso = now.isoformat() + "Z"

    if req.action == "APPROVE":
        sig = create_digital_signature(
            officer_id=req.officer_id,
            role=req.role,
            action=f"APPROVE_STAGE_{app.current_stage_index}",
            entity_id=app.id,
            timestamp_iso=now_iso
        )
        current_stage.status = "APPROVED"
        current_stage.completed_at = now
        current_stage.officer_remarks = req.remarks or "Statutory requirements verified and found in order."
        current_stage.digital_signature = json.dumps(sig)

        audit = AuditEvent(
            entity_type="APPLICATION",
            entity_id=app.id,
            actor_name=req.officer_name,
            actor_role=req.role,
            action=f"STAGE_{app.current_stage_index}_APPROVED",
            details=f"Officer '{req.officer_name}' ({current_stage.department}) completed verification with digital certificate {sig['pubkey_fingerprint']}."
        )
        db.add(audit)

        if app.current_stage_index < 4:
            app.current_stage_index += 1
            next_stage = next((s for s in app.stages if s.stage_order == app.current_stage_index), None)
            if next_stage:
                next_stage.status = "IN_PROGRESS"
                next_stage.assigned_at = now
                next_stage.deadline_at = now + datetime.timedelta(days=next_stage.sla_days)
        else:
            app.status = "APPROVED"
            parcel = app.parcel
            old_owner_name = parcel.current_owner_name
            new_owner_name = app.buyer_name

            # 1. Update Parcel State
            parcel.current_owner_name = new_owner_name
            parcel.is_for_sale = False
            parcel.listing_price_lakhs = None

            # 2. Append Ownership History
            history_record = OwnershipHistory(
                parcel_id=parcel.id,
                year=now.year,
                previous_owner_name=old_owner_name,
                new_owner_name=new_owner_name,
                transfer_type=app.transfer_type,
                transaction_value_lakhs=app.declared_value_lakhs,
                registration_number=f"REG-SRO-{parcel.district[:3].upper()}/{now.year}/{app.id[-4:]}",
                registration_date=now.strftime("%Y-%m-%d"),
                document_hash=app.documents[0].sha256_hash if app.documents else calculate_sha256(app.id),
                approving_authority=f"SDM / Collectorate, {parcel.district}"
            )
            db.add(history_record)

            all_sigs = []
            for s in app.stages:
                if s.digital_signature:
                    try:
                        all_sigs.append(json.loads(s.digital_signature))
                    except Exception:
                        pass

            last_block = db.query(LedgerBlock).order_by(desc(LedgerBlock.block_index)).first()
            prev_hash = last_block.block_hash if last_block else ("0" * 64)
            new_index = (last_block.block_index + 1) if last_block else 0

            doc_hashes = [d.sha256_hash for d in app.documents]
            payload_data = {
                "application_id": app.id,
                "parcel_id": parcel.id,
                "ulin_pin": parcel.ulin_pin,
                "state": parcel.state,
                "district": parcel.district,
                "khasra_no": parcel.khasra_no,
                "area_sqft": parcel.area_sqft,
                "previous_owner_ref_salt": calculate_sha256(old_owner_name + "GOV_SALT_2026")[:24],
                "new_owner_ref_salt": calculate_sha256(new_owner_name + "GOV_SALT_2026")[:24],
                "transfer_type": app.transfer_type,
                "declared_value_lakhs": app.declared_value_lakhs,
                "formatted_value": format_indian_currency(app.declared_value_lakhs),
                "stamp_duty_paid_lakhs": app.stamp_duty_paid_lakhs,
                "statutory_clearances": [s.stage_name for s in app.stages if s.status == "APPROVED"]
            }

            block_dict = BhulekhLedgerEngine.create_block(
                block_index=new_index,
                parcel_id=parcel.id,
                event_type="OWNERSHIP_TRANSFER_STATUTORY_FINAL",
                payload=payload_data,
                previous_hash=prev_hash,
                officer_signatures=all_sigs,
                document_hashes=doc_hashes,
                custom_timestamp=now
            )

            new_block = LedgerBlock(
                block_index=block_dict["block_index"],
                timestamp=block_dict["timestamp"],
                parcel_id=block_dict["parcel_id"],
                event_type=block_dict["event_type"],
                payload_json=block_dict["payload_json"],
                payload_hash=block_dict["payload_hash"],
                previous_hash=block_dict["previous_hash"],
                merkle_root=block_dict["merkle_root"],
                officer_signatures=block_dict["officer_signatures"],
                block_hash=block_dict["block_hash"],
                nonce=0
            )
            db.add(new_block)

            app.final_ledger_block_index = new_index
            app.final_ledger_tx_hash = block_dict["block_hash"]
            history_record.ledger_tx_hash = block_dict["block_hash"]

            audit_mint = AuditEvent(
                entity_type="LEDGER",
                entity_id=parcel.id,
                actor_name="GovLand Sovereign Ledger Node",
                actor_role="SYSTEM_LEDGER",
                action="BLOCKCHAIN_BLOCK_MINTED",
                details=f"Minted Block #{new_index} committing final ownership transfer for Parcel {parcel.id} to '{new_owner_name}'."
            )
            db.add(audit_mint)

    elif req.action == "REJECT":
        if not req.rejection_category:
            raise ValueError("Structured rejection category is mandatory for statutory rejections.")
        
        current_stage.status = "REJECTED"
        current_stage.completed_at = now
        current_stage.officer_remarks = req.remarks

        app.status = "REJECTED"
        app.rejection_category = req.rejection_category
        app.rejection_remarks = req.remarks or f"Rejected under category: {req.rejection_category}"
        app.rejection_officer_name = req.officer_name
        app.rejection_department = current_stage.department
        app.rejected_at = now

        audit = AuditEvent(
            entity_type="APPLICATION",
            entity_id=app.id,
            actor_name=req.officer_name,
            actor_role=req.role,
            action="APPLICATION_REJECTED",
            details=f"Application rejected at stage '{current_stage.stage_name}'. Category: '{req.rejection_category}'. Remarks: '{req.remarks}'."
        )
        db.add(audit)

    elif req.action == "REQUEST_CORRECTION":
        current_stage.status = "PENDING"
        app.status = "CORRECTION_REQUESTED"
        app.rejection_category = req.rejection_category or "Correction Requested"
        app.rejection_remarks = req.remarks
        app.rejection_officer_name = req.officer_name
        app.rejection_department = current_stage.department

        audit = AuditEvent(
            entity_type="APPLICATION",
            entity_id=app.id,
            actor_name=req.officer_name,
            actor_role=req.role,
            action="CORRECTION_REQUESTED",
            details=f"Officer requested applicant to correct application / upload missing proofs: '{req.remarks}'."
        )
        db.add(audit)

    elif req.action == "SUBMIT_DELAY_EXPLANATION":
        app.delay_explanation = req.delay_explanation
        audit = AuditEvent(
            entity_type="SLA",
            entity_id=app.id,
            actor_name=req.officer_name,
            actor_role=req.role,
            action="DELAY_EXPLANATION_SUBMITTED",
            details=f"Officer submitted statutory delay explanation: '{req.delay_explanation}'."
        )
        db.add(audit)

    db.commit()
    db.refresh(app)
    return app

def submit_citizen_correction(db: Session, application_id: str, req: CitizenCorrectionRequest, actor_name: str) -> Application:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise ValueError("Application not found")
    
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    app.status = "UNDER_REVIEW"
    app.updated_at = now
    
    current_stage = next((s for s in app.stages if s.stage_order == app.current_stage_index), None)
    if current_stage:
        current_stage.status = "IN_PROGRESS"
        current_stage.assigned_at = now
        current_stage.deadline_at = now + datetime.timedelta(days=current_stage.sla_days)

    for d in req.new_documents:
        doc_hash = d.get("sha256_hash") or calculate_sha256(f"{d.get('file_name', 'corr.pdf')}:{now.isoformat()}")
        doc = Document(
            id=f"DOC-{app.id[-4:]}-CORR-{len(app.documents)+1}",
            application_id=app.id,
            parcel_id=app.parcel_id,
            doc_type=d.get("doc_type", "CORRECTION_AFFIDAVIT"),
            title=d.get("title", "Corrected Document / Rectification Deed"),
            file_name=d.get("file_name", "rectified_document.pdf"),
            file_size_kb=380.0,
            sha256_hash=doc_hash,
            verification_status="VERIFIED",
            uploaded_by=actor_name,
            uploaded_at=now,
            remarks=req.remarks
        )
        db.add(doc)

    audit = AuditEvent(
        entity_type="APPLICATION",
        entity_id=app.id,
        actor_name=actor_name,
        actor_role="CITIZEN",
        action="CORRECTION_SUBMITTED",
        details=f"Citizen submitted rectification and supplementary documentation. Explanation: '{req.remarks}'."
    )
    db.add(audit)
    db.commit()
    db.refresh(app)
    return app

def submit_citizen_appeal(db: Session, application_id: str, req: CitizenAppealRequest, actor_name: str) -> Application:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise ValueError("Application not found")
    
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    app.is_appealed = True
    app.appeal_remarks = req.appeal_remarks
    app.appealed_at = now
    app.appeal_status = "PENDING_REVIEW"
    app.status = "APPEALED"

    audit = AuditEvent(
        entity_type="APPEAL",
        entity_id=app.id,
        actor_name=actor_name,
        actor_role="CITIZEN",
        action="STATUTORY_APPEAL_FILED",
        details=f"Citizen filed formal appeal against rejection order. Grounds: '{req.appeal_remarks}'."
    )
    db.add(audit)
    db.commit()
    db.refresh(app)
    return app
