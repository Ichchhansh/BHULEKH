import datetime
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db, engine, Base
from models import (
    User, Parcel, OwnershipHistory, Application, ApplicationStage,
    Document, AuditEvent, LedgerBlock
)
from schemas import (
    UserOut, ParcelPublicOut, ParcelDetail, OwnershipHistoryOut,
    DocumentOut, ApplicationSummary, ApplicationDetail,
    ApplicationCreateRequest, OfficerActionRequest,
    CitizenCorrectionRequest, CitizenAppealRequest,
    PropertyListingToggleRequest, AuditEventOut,
    LedgerBlockOut, TamperSimulateRequest, OfficerDashboardStats
)
import crud
from ledger import BhulekhLedgerEngine, calculate_sha256
from sla_engine import evaluate_and_update_application_slas, calculate_sla_status, STAGE_SLA_CONFIG, REJECTION_CATEGORIES
import seed_data

app = FastAPI(
    title="BHULEKH LEDGER API",
    description="Statutory Digital Land Governance & Sovereign Cryptographic Ownership Infrastructure",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        evaluate_and_update_application_slas(db)
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {
        "status": "OPERATIONAL",
        "service": "Bhulekh Ledger National Infrastructure",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "jurisdiction": "Republic of India",
        "ledger_engine": "Permissioned SHA-256 / Merkle Multi-Sign Engine"
    }

# ==================== USERS & RBAC ====================

@app.get("/api/users", response_model=List[UserOut])
def get_all_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()

@app.get("/api/users/{user_id}", response_model=UserOut)
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u

# ==================== PARCELS & GIS ====================

def map_parcel_public(p: Parcel) -> Dict[str, Any]:
    # Circle rate valuation in Lakhs
    estimated_lakhs = round((p.area_sqft * p.circle_rate_sqft_2026) / 100000.0, 2)
    formatted_val = crud.format_indian_currency(estimated_lakhs)
    
    return {
        "id": p.id,
        "ulin_pin": p.ulin_pin,
        "state": p.state,
        "revenue_authority": p.revenue_authority,
        "district": p.district,
        "tehsil": p.tehsil,
        "village": p.village,
        "khasra_no": p.khasra_no,
        "khata_no": p.khata_no,
        "land_use": p.land_use,
        "area_sqft": p.area_sqft,
        "area_sqm": p.area_sqm,
        "area_local_unit": p.area_local_unit,
        "circle_rate_sqft_2026": p.circle_rate_sqft_2026,
        "circle_rate_2026": p.circle_rate_2026,
        "circle_rate_2025": p.circle_rate_2025,
        "circle_rate_2024": p.circle_rate_2024,
        "estimated_govt_value_lakhs": estimated_lakhs,
        "formatted_value_str": formatted_val,
        "current_owner_id": p.current_owner_id,
        "current_owner_name": p.current_owner_name,
        "ownership_status": "Statutorily Verified" if not p.is_disputed else "Dispute / Injunction Flagged",
        "is_for_sale": p.is_for_sale,
        "listing_price_lakhs": p.listing_price_lakhs,
        "is_disputed": p.is_disputed,
        "is_mortgaged": p.is_mortgaged,
        "tax_cleared": p.tax_cleared,
        "boundary_verified": p.boundary_verified,
        "risk_rating": p.risk_rating,
        "centroid_lat": p.centroid_lat,
        "centroid_lng": p.centroid_lng,
        "geometry_geojson": p.geometry_geojson
    }

def map_parcel_detail(p: Parcel) -> Dict[str, Any]:
    base = map_parcel_public(p)
    base.update({
        "current_owner_id": p.current_owner_id,
        "current_owner_name": p.current_owner_name,
        "dispute_case_no": p.dispute_case_no,
        "dispute_details": p.dispute_details,
        "mortgage_bank": p.mortgage_bank,
        "mortgage_amount_lakhs": p.mortgage_amount_lakhs,
        "ownership_history": p.ownership_history,
        "documents": p.documents
    })
    return base

@app.get("/api/parcels", response_model=List[ParcelPublicOut])
def list_parcels(
    state: Optional[str] = None,
    district: Optional[str] = None,
    tehsil: Optional[str] = None,
    village: Optional[str] = None,
    land_use: Optional[str] = None,
    is_for_sale: Optional[bool] = None,
    is_disputed: Optional[bool] = None,
    search: Optional[str] = None,
    owner_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    parcels = crud.get_parcels(
        db=db,
        state=state,
        district=district,
        tehsil=tehsil,
        village=village,
        land_use=land_use,
        is_for_sale=is_for_sale,
        is_disputed=is_disputed,
        search=search,
        owner_id=owner_id
    )
    return [map_parcel_public(p) for p in parcels]

@app.get("/api/parcels/{parcel_id}", response_model=ParcelDetail)
def get_parcel_detail(parcel_id: str, db: Session = Depends(get_db)):
    p = crud.get_parcel_by_id(db, parcel_id)
    if not p:
        raise HTTPException(status_code=404, detail="Parcel record not found")
    return map_parcel_detail(p)

@app.post("/api/parcels/{parcel_id}/toggle-listing")
def toggle_listing(
    parcel_id: str,
    req: PropertyListingToggleRequest,
    actor_name: str = Query("Citizen Landowner"),
    db: Session = Depends(get_db)
):
    p = crud.toggle_property_listing(db, parcel_id, req, actor_name)
    if not p:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return {
        "message": "Listing status updated successfully",
        "is_for_sale": p.is_for_sale,
        "listing_price_lakhs": p.listing_price_lakhs,
        "formatted_price": crud.format_indian_currency(p.listing_price_lakhs or 0)
    }

# ==================== APPLICATIONS & WORKFLOW ====================

def enrich_stage(s: ApplicationStage) -> Dict[str, Any]:
    sla_info = calculate_sla_status(s.deadline_at, s.completed_at)
    return {
        "id": s.id,
        "stage_order": s.stage_order,
        "stage_name": s.stage_name,
        "department": s.department,
        "assigned_role": s.assigned_role,
        "assigned_officer_id": s.assigned_officer_id,
        "assigned_officer_name": s.assigned_officer_name,
        "status": s.status,
        "sla_days": s.sla_days,
        "assigned_at": s.assigned_at,
        "deadline_at": s.deadline_at,
        "completed_at": s.completed_at,
        "officer_remarks": s.officer_remarks,
        "digital_signature": s.digital_signature,
        "time_remaining_str": sla_info["time_remaining_str"],
        "is_breached": sla_info["is_breached"]
    }

def enrich_application(app: Application) -> Dict[str, Any]:
    enriched_stages = [enrich_stage(s) for s in app.stages]
    return {
        "id": app.id,
        "parcel_id": app.parcel_id,
        "applicant_id": app.applicant_id,
        "applicant_name": app.applicant.full_name if app.applicant else "Citizen",
        "buyer_name": app.buyer_name,
        "buyer_masked_aadhaar": app.buyer_masked_aadhaar,
        "buyer_phone_masked": app.buyer_phone_masked,
        "transfer_type": app.transfer_type,
        "declared_value_lakhs": app.declared_value_lakhs,
        "formatted_declared_value": crud.format_indian_currency(app.declared_value_lakhs),
        "stamp_duty_paid_lakhs": app.stamp_duty_paid_lakhs,
        "current_stage_index": app.current_stage_index,
        "status": app.status,
        "created_at": app.created_at,
        "sla_deadline": app.sla_deadline,
        "is_sla_breached": app.is_sla_breached,
        "supervisor_notified": app.supervisor_notified,
        "delay_explanation": app.delay_explanation,
        "rejection_category": app.rejection_category,
        "rejection_remarks": app.rejection_remarks,
        "rejection_officer_name": app.rejection_officer_name,
        "rejection_department": app.rejection_department,
        "rejected_at": app.rejected_at,
        "is_appealed": app.is_appealed,
        "appeal_remarks": app.appeal_remarks,
        "appealed_at": app.appealed_at,
        "appeal_status": app.appeal_status,
        "final_ledger_block_index": app.final_ledger_block_index,
        "final_ledger_tx_hash": app.final_ledger_tx_hash,
        "parcel_district": app.parcel.district if app.parcel else None,
        "parcel_village": app.parcel.village if app.parcel else None,
        "parcel": map_parcel_detail(app.parcel) if app.parcel else None,
        "stages": enriched_stages,
        "documents": app.documents
    }

@app.get("/api/applications", response_model=List[ApplicationSummary])
def list_applications(
    applicant_id: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    is_breached: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    evaluate_and_update_application_slas(db)
    query = db.query(Application)
    if applicant_id:
        query = query.filter(Application.applicant_id == applicant_id)
    if status:
        query = query.filter(Application.status == status)
    if is_breached is not None:
        query = query.filter(Application.is_sla_breached == is_breached)
    
    apps = query.order_by(desc(Application.created_at)).all()
    
    if role and role not in ["CITIZEN", "ADMIN", "SDM_APPROVER"]:
        filtered = []
        for a in apps:
            curr_stage = next((s for s in a.stages if s.stage_order == a.current_stage_index), None)
            if curr_stage and curr_stage.assigned_role == role:
                filtered.append(a)
        apps = filtered

    return [enrich_application(a) for a in apps]

@app.get("/api/applications/{application_id}", response_model=ApplicationDetail)
def get_application_detail(application_id: str, db: Session = Depends(get_db)):
    evaluate_and_update_application_slas(db)
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return enrich_application(app)

@app.post("/api/applications", response_model=ApplicationDetail)
def submit_new_application(
    req: ApplicationCreateRequest,
    applicant_id: str = Query("usr_citizen_1"),
    db: Session = Depends(get_db)
):
    try:
        app = crud.create_application(db, applicant_id, req)
        return enrich_application(app)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/applications/{application_id}/officer-action", response_model=ApplicationDetail)
def officer_action(
    application_id: str,
    req: OfficerActionRequest,
    db: Session = Depends(get_db)
):
    try:
        app = crud.process_officer_action(db, application_id, req)
        return enrich_application(app)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/applications/{application_id}/citizen-correction", response_model=ApplicationDetail)
def citizen_correction(
    application_id: str,
    req: CitizenCorrectionRequest,
    actor_name: str = Query("Rajesh Kumar Sharma"),
    db: Session = Depends(get_db)
):
    try:
        app = crud.submit_citizen_correction(db, application_id, req, actor_name)
        return enrich_application(app)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/applications/{application_id}/citizen-appeal", response_model=ApplicationDetail)
def citizen_appeal(
    application_id: str,
    req: CitizenAppealRequest,
    actor_name: str = Query("Rajesh Kumar Sharma"),
    db: Session = Depends(get_db)
):
    try:
        app = crud.submit_citizen_appeal(db, application_id, req, actor_name)
        return enrich_application(app)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== BLOCKCHAIN LEDGER & AUDIT TRAIL ====================

@app.get("/api/ledger/blocks", response_model=List[LedgerBlockOut])
def get_ledger_blocks(parcel_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(LedgerBlock)
    if parcel_id:
        query = query.filter(LedgerBlock.parcel_id == parcel_id)
    return query.order_by(LedgerBlock.block_index).all()

@app.get("/api/ledger/verify-chain")
def verify_ledger_integrity(db: Session = Depends(get_db)):
    blocks = db.query(LedgerBlock).order_by(LedgerBlock.block_index).all()
    result = BhulekhLedgerEngine.verify_ledger_chain(blocks)
    return result

@app.post("/api/ledger/simulate-tamper")
def simulate_ledger_tamper(req: TamperSimulateRequest, db: Session = Depends(get_db)):
    block = db.query(LedgerBlock).filter(LedgerBlock.block_index == req.block_index).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    try:
        data = json.loads(block.payload_json)
    except Exception:
        data = {"tampered": True}
    
    data[req.tampered_payload_field] = req.fraudulent_value
    block.payload_json = json.dumps(data)
    db.commit()

    audit = AuditEvent(
        entity_type="LEDGER",
        entity_id=f"BLOCK_#{req.block_index}",
        actor_name="Security Research / Chaos Engine",
        actor_role="TEST_AUDITOR",
        action="TAMPER_SIMULATION_INJECTED",
        details=f"Injected fraudulent payload into Block #{req.block_index}. Changed '{req.tampered_payload_field}' to '{req.fraudulent_value}'."
    )
    db.add(audit)
    db.commit()

    blocks = db.query(LedgerBlock).order_by(LedgerBlock.block_index).all()
    verification = BhulekhLedgerEngine.verify_ledger_chain(blocks)

    return {
        "message": "Tamper simulation executed! Verify how the cryptographic consensus flagged the fraud.",
        "tampered_block_index": req.block_index,
        "verification_result": verification
    }

@app.post("/api/ledger/reset-tamper")
def reset_tamper_demo():
    seed_data.seed_database()
    return {"message": "Database and ledger reset to pristine verified state!"}

@app.get("/api/audit-events", response_model=List[AuditEventOut])
def get_audit_events(
    entity_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditEvent)
    if entity_id:
        query = query.filter(AuditEvent.entity_id == entity_id)
    return query.order_by(desc(AuditEvent.timestamp)).limit(limit).all()

# ==================== DASHBOARD STATS ====================

@app.get("/api/stats/officer-dashboard", response_model=OfficerDashboardStats)
def get_officer_dashboard_stats(role: Optional[str] = None, db: Session = Depends(get_db)):
    evaluate_and_update_application_slas(db)
    
    total = db.query(Application).count()
    pending = db.query(Application).filter(Application.status.in_(["SUBMITTED", "UNDER_REVIEW", "CORRECTION_REQUESTED"])).count()
    approved = db.query(Application).filter(Application.status == "APPROVED").count()
    rejected = db.query(Application).filter(Application.status == "REJECTED").count()
    sla_breached = db.query(Application).filter(Application.is_sla_breached == True).count()
    appeals = db.query(Application).filter(Application.is_appealed == True).count()
    disputed = db.query(Parcel).filter(Parcel.is_disputed == True).count()

    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    approaching = 0
    active_stages = db.query(ApplicationStage).filter(ApplicationStage.status.in_(["PENDING", "IN_PROGRESS"])).all()
    for s in active_stages:
        if s.deadline_at > now and (s.deadline_at - now).total_seconds() < 86400:
            approaching += 1

    return {
        "total_assigned": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "sla_approaching": approaching,
        "sla_breached": sla_breached,
        "appeals": appeals,
        "disputed_parcels": disputed
    }

@app.get("/api/stats/citizen-dashboard/{user_id}")
def get_citizen_dashboard_stats(user_id: str, db: Session = Depends(get_db)):
    owned_parcels = db.query(Parcel).filter(Parcel.current_owner_id == user_id).all()
    total_area_sqft = sum(p.area_sqft for p in owned_parcels)
    total_est_val = sum((p.area_sqft * p.circle_rate_sqft_2026) / 100000.0 for p in owned_parcels)
    active_apps = db.query(Application).filter(Application.applicant_id == user_id).all()

    return {
        "owned_parcels_count": len(owned_parcels),
        "total_land_area_sqft": total_area_sqft,
        "total_estimated_value_lakhs": round(total_est_val, 2),
        "formatted_total_value": crud.format_indian_currency(total_est_val),
        "active_applications_count": len(active_apps),
        "parcels": [map_parcel_public(p) for p in owned_parcels]
    }

@app.get("/api/config/sla-rules")
def get_sla_rules():
    return {
        "stages": STAGE_SLA_CONFIG,
        "rejection_categories": REJECTION_CATEGORIES
    }
