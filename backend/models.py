import datetime
import json
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True) # e.g. "usr_citizen_1"
    username = Column(String(100), unique=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True)
    role = Column(String(50), nullable=False) # CITIZEN, REVENUE_OFFICER, REGISTRATION_OFFICER, SURVEY_OFFICER, LEGAL_OFFICER, SDM_APPROVER, ADMIN
    department = Column(String(100), default="General Public")
    phone_masked = Column(String(20), default="+91 98XXX-XX123")
    aadhaar_masked = Column(String(20), default="XXXX-XXXX-4589")
    pan_masked = Column(String(20), default="ABCXX1234X")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owned_parcels = relationship("Parcel", back_populates="current_owner")
    applications_created = relationship("Application", foreign_keys="Application.applicant_id", back_populates="applicant")

class Parcel(Base):
    __tablename__ = "parcels"

    id = Column(String(50), primary_key=True) # e.g. "UP-GZB-IND-00012345"
    ulin_pin = Column(String(30), unique=True, index=True) # Unique Land Parcel Identification Number
    state = Column(String(100), nullable=False) # Uttar Pradesh, Karnataka, Maharashtra
    revenue_authority = Column(String(150), default="Board of Revenue, Uttar Pradesh")
    district = Column(String(100), nullable=False)
    tehsil = Column(String(100), nullable=False)
    village = Column(String(100), nullable=False)
    khasra_no = Column(String(50), nullable=False)
    khata_no = Column(String(50), nullable=False)
    land_use = Column(String(50), default="Agricultural") # Agricultural, Residential, Commercial, Industrial
    
    # Area Measurements
    area_sqft = Column(Float, nullable=False) # Primary in Sq. Ft.
    area_sqm = Column(Float, nullable=False)  # Sq. Meters
    area_local_unit = Column(String(50), default="0.25 Acres / 1.5 Bigha")
    
    # Valuation & Circle Rates (INR per Sq. Ft. and Sq. M.)
    circle_rate_sqft_2026 = Column(Float, nullable=False) # INR / sqft
    circle_rate_2026 = Column(Float, nullable=False)      # INR / sqm
    circle_rate_2025 = Column(Float, nullable=False)
    circle_rate_2024 = Column(Float, nullable=False)
    
    current_owner_id = Column(String(50), ForeignKey("users.id"), nullable=True)
    current_owner_name = Column(String(150), nullable=False)
    
    # Flags & Statuses
    is_for_sale = Column(Boolean, default=False)
    listing_price_lakhs = Column(Float, nullable=True)
    is_disputed = Column(Boolean, default=False)
    dispute_case_no = Column(String(100), nullable=True)
    dispute_details = Column(Text, nullable=True)
    
    is_mortgaged = Column(Boolean, default=False)
    mortgage_bank = Column(String(150), nullable=True)
    mortgage_amount_lakhs = Column(Float, nullable=True)
    
    tax_cleared = Column(Boolean, default=True)
    boundary_verified = Column(Boolean, default=True)
    risk_rating = Column(String(30), default="LOW_RISK") # LOW_RISK, REVIEW_REQUIRED, HIGH_RISK
    
    # Cadastral GIS (GeoJSON string for Leaflet)
    geometry_geojson = Column(Text, nullable=False)
    centroid_lat = Column(Float, nullable=False)
    centroid_lng = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    current_owner = relationship("User", back_populates="owned_parcels")
    ownership_history = relationship("OwnershipHistory", back_populates="parcel", order_by="desc(OwnershipHistory.year)")
    applications = relationship("Application", back_populates="parcel")
    documents = relationship("Document", back_populates="parcel")
    ledger_blocks = relationship("LedgerBlock", back_populates="parcel", order_by="LedgerBlock.block_index")

class OwnershipHistory(Base):
    __tablename__ = "ownership_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parcel_id = Column(String(50), ForeignKey("parcels.id"), nullable=False)
    year = Column(Integer, nullable=False)
    previous_owner_name = Column(String(150), nullable=True)
    new_owner_name = Column(String(150), nullable=False)
    transfer_type = Column(String(100), default="PURCHASE")
    transaction_value_lakhs = Column(Float, default=0.0) # In Lakhs INR
    registration_number = Column(String(100), default="REG-SRO-UP/2026/894")
    registration_date = Column(String(50), default="2026-01-15")
    document_hash = Column(String(64), nullable=True)
    ledger_tx_hash = Column(String(64), nullable=True)
    approving_authority = Column(String(150), default="Sub-Divisional Magistrate / SRO")

    parcel = relationship("Parcel", back_populates="ownership_history")

class Application(Base):
    __tablename__ = "applications"

    id = Column(String(50), primary_key=True) # e.g. "APP-2026-GZB-0921"
    parcel_id = Column(String(50), ForeignKey("parcels.id"), nullable=False)
    applicant_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    
    # Transfer Details
    buyer_id = Column(String(50), ForeignKey("users.id"), nullable=True)
    buyer_name = Column(String(150), nullable=False)
    buyer_masked_aadhaar = Column(String(20), default="XXXX-XXXX-9912")
    buyer_phone_masked = Column(String(20), default="+91 97XXX-XX889")
    transfer_type = Column(String(50), default="SALE_DEED_MUTATION")
    declared_value_lakhs = Column(Float, default=0.0) # In Lakhs INR
    stamp_duty_paid_lakhs = Column(Float, default=0.0)
    
    # Workflow Stage & Status
    current_stage_index = Column(Integer, default=0)
    status = Column(String(50), default="UNDER_REVIEW")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Overall SLA
    sla_deadline = Column(DateTime, nullable=False)
    is_sla_breached = Column(Boolean, default=False)
    sla_breach_notified_at = Column(DateTime, nullable=True)
    delay_explanation = Column(Text, nullable=True)
    supervisor_notified = Column(Boolean, default=False)
    
    # Rejection & Appeal System
    rejection_category = Column(String(100), nullable=True)
    rejection_remarks = Column(Text, nullable=True)
    rejection_officer_name = Column(String(150), nullable=True)
    rejection_department = Column(String(100), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    
    is_appealed = Column(Boolean, default=False)
    appeal_remarks = Column(Text, nullable=True)
    appealed_at = Column(DateTime, nullable=True)
    appeal_status = Column(String(50), nullable=True)

    # Blockchain Minting upon Completion
    final_ledger_block_index = Column(Integer, nullable=True)
    final_ledger_tx_hash = Column(String(64), nullable=True)

    # Relationships
    parcel = relationship("Parcel", back_populates="applications")
    applicant = relationship("User", foreign_keys=[applicant_id], back_populates="applications_created")
    buyer = relationship("User", foreign_keys=[buyer_id])
    stages = relationship("ApplicationStage", back_populates="application", order_by="ApplicationStage.stage_order", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")

class ApplicationStage(Base):
    __tablename__ = "application_stages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String(50), ForeignKey("applications.id"), nullable=False)
    stage_order = Column(Integer, nullable=False)
    stage_name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    assigned_role = Column(String(50), nullable=False)
    assigned_officer_id = Column(String(50), nullable=True)
    assigned_officer_name = Column(String(150), nullable=True)
    
    status = Column(String(50), default="PENDING")
    sla_days = Column(Integer, default=7)
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)
    deadline_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    officer_remarks = Column(Text, nullable=True)
    digital_signature = Column(String(256), nullable=True)

    application = relationship("Application", back_populates="stages")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(50), primary_key=True)
    application_id = Column(String(50), ForeignKey("applications.id"), nullable=True)
    parcel_id = Column(String(50), ForeignKey("parcels.id"), nullable=False)
    doc_type = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    file_name = Column(String(200), nullable=False)
    file_size_kb = Column(Float, default=450.0)
    mime_type = Column(String(50), default="application/pdf")
    
    sha256_hash = Column(String(64), nullable=False)
    verification_status = Column(String(50), default="VERIFIED")
    uploaded_by = Column(String(100), default="Citizen")
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    remarks = Column(Text, nullable=True)

    parcel = relationship("Parcel", back_populates="documents")
    application = relationship("Application", back_populates="documents")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=False)
    actor_name = Column(String(150), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=False)
    ip_address = Column(String(50), default="10.42.0.1 (NIC GovNet)")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class LedgerBlock(Base):
    __tablename__ = "ledger_blocks"

    block_index = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    parcel_id = Column(String(50), ForeignKey("parcels.id"), nullable=False)
    event_type = Column(String(100), nullable=False)
    
    payload_json = Column(Text, nullable=False)
    payload_hash = Column(String(64), nullable=False)
    previous_hash = Column(String(64), nullable=False)
    merkle_root = Column(String(64), nullable=False)
    officer_signatures = Column(Text, nullable=False)
    block_hash = Column(String(64), nullable=False)
    nonce = Column(Integer, default=0)

    parcel = relationship("Parcel", back_populates="ledger_blocks")
