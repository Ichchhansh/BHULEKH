from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import datetime

class UserOut(BaseModel):
    id: str
    username: str
    full_name: str
    email: str
    role: str
    department: str
    phone_masked: str
    aadhaar_masked: str
    pan_masked: str

    class Config:
        from_attributes = True

class OwnershipHistoryOut(BaseModel):
    id: int
    year: int
    previous_owner_name: Optional[str]
    new_owner_name: str
    transfer_type: str
    transaction_value_lakhs: float
    registration_number: str
    registration_date: str
    document_hash: Optional[str]
    ledger_tx_hash: Optional[str]
    approving_authority: str

    class Config:
        from_attributes = True

class DocumentOut(BaseModel):
    id: str
    application_id: Optional[str]
    parcel_id: str
    doc_type: str
    title: str
    file_name: str
    file_size_kb: float
    mime_type: str
    sha256_hash: str
    verification_status: str
    uploaded_by: str
    uploaded_at: datetime.datetime
    remarks: Optional[str]

    class Config:
        from_attributes = True

class ParcelPublicOut(BaseModel):
    id: str
    ulin_pin: str
    state: str
    revenue_authority: str
    district: str
    tehsil: str
    village: str
    khasra_no: str
    khata_no: str
    land_use: str
    
    # Area & Valuation
    area_sqft: float
    area_sqm: float
    area_local_unit: str
    circle_rate_sqft_2026: float
    circle_rate_2026: float
    circle_rate_2025: float
    circle_rate_2024: float
    estimated_govt_value_lakhs: float
    formatted_value_str: str # e.g. "₹85.00 Lakhs" or "₹2.45 Crores"
    
    # Owner Info
    current_owner_id: Optional[str] = None
    current_owner_name: Optional[str] = None
    
    # Public mask
    ownership_status: str
    is_for_sale: bool
    listing_price_lakhs: Optional[float]
    is_disputed: bool
    is_mortgaged: bool
    tax_cleared: bool
    boundary_verified: bool
    risk_rating: str
    
    centroid_lat: float
    centroid_lng: float
    geometry_geojson: str

class ParcelDetail(ParcelPublicOut):
    current_owner_id: Optional[str]
    current_owner_name: str
    dispute_case_no: Optional[str]
    dispute_details: Optional[str]
    mortgage_bank: Optional[str]
    mortgage_amount_lakhs: Optional[float]
    ownership_history: List[OwnershipHistoryOut] = []
    documents: List[DocumentOut] = []

    class Config:
        from_attributes = True

class ApplicationStageOut(BaseModel):
    id: int
    stage_order: int
    stage_name: str
    department: str
    assigned_role: str
    assigned_officer_id: Optional[str]
    assigned_officer_name: Optional[str]
    status: str
    sla_days: int
    assigned_at: datetime.datetime
    deadline_at: datetime.datetime
    completed_at: Optional[datetime.datetime]
    officer_remarks: Optional[str]
    digital_signature: Optional[str]
    
    time_remaining_str: Optional[str] = None
    is_breached: Optional[bool] = None

    class Config:
        from_attributes = True

class ApplicationSummary(BaseModel):
    id: str
    parcel_id: str
    applicant_id: str
    applicant_name: Optional[str]
    buyer_name: str
    transfer_type: str
    declared_value_lakhs: float
    formatted_declared_value: str
    current_stage_index: int
    status: str
    created_at: datetime.datetime
    sla_deadline: datetime.datetime
    is_sla_breached: bool
    supervisor_notified: bool
    rejection_category: Optional[str]
    is_appealed: bool
    parcel_district: Optional[str] = None
    parcel_village: Optional[str] = None

    class Config:
        from_attributes = True

class ApplicationDetail(ApplicationSummary):
    buyer_masked_aadhaar: str
    buyer_phone_masked: str
    stamp_duty_paid_lakhs: float
    delay_explanation: Optional[str]
    rejection_remarks: Optional[str]
    rejection_officer_name: Optional[str]
    rejection_department: Optional[str]
    rejected_at: Optional[datetime.datetime]
    appeal_remarks: Optional[str]
    appealed_at: Optional[datetime.datetime]
    appeal_status: Optional[str]
    final_ledger_block_index: Optional[int]
    final_ledger_tx_hash: Optional[str]
    
    parcel: Optional[ParcelDetail] = None
    stages: List[ApplicationStageOut] = []
    documents: List[DocumentOut] = []

    class Config:
        from_attributes = True

class ApplicationCreateRequest(BaseModel):
    parcel_id: str
    buyer_name: str
    buyer_masked_aadhaar: str = "XXXX-XXXX-9841"
    buyer_phone_masked: str = "+91 98XXX-XX991"
    transfer_type: str = "SALE_DEED_MUTATION"
    declared_value_lakhs: float
    stamp_duty_paid_lakhs: float
    documents: List[Dict[str, Any]] = []

class OfficerActionRequest(BaseModel):
    action: str
    officer_id: str
    officer_name: str
    role: str
    rejection_category: Optional[str] = None
    remarks: Optional[str] = None
    delay_explanation: Optional[str] = None

class CitizenCorrectionRequest(BaseModel):
    remarks: str
    new_documents: List[Dict[str, Any]] = []

class CitizenAppealRequest(BaseModel):
    appeal_remarks: str

class PropertyListingToggleRequest(BaseModel):
    is_for_sale: bool
    listing_price_lakhs: Optional[float] = None

class AuditEventOut(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    actor_name: str
    actor_role: str
    action: str
    details: str
    ip_address: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class LedgerBlockOut(BaseModel):
    block_index: int
    timestamp: datetime.datetime
    parcel_id: str
    event_type: str
    payload_json: str
    payload_hash: str
    previous_hash: str
    merkle_root: str
    officer_signatures: str
    block_hash: str
    nonce: int

    class Config:
        from_attributes = True

class TamperSimulateRequest(BaseModel):
    block_index: int
    tampered_payload_field: str = "status"
    fraudulent_value: str = "UNAUTHORIZED_FRAUDULENT_RECORD_MODIFICATION"

class OfficerDashboardStats(BaseModel):
    total_assigned: int
    pending: int
    approved: int
    rejected: int
    sla_approaching: int
    sla_breached: int
    appeals: int
    disputed_parcels: int
