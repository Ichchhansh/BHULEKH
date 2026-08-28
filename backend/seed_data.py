import datetime
import json
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import (
    User, Parcel, OwnershipHistory, Application, ApplicationStage,
    Document, AuditEvent, LedgerBlock
)
from ledger import BhulekhLedgerEngine, calculate_sha256, create_digital_signature
from sla_engine import STAGE_SLA_CONFIG

def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

    # 1. Seed Users
    users_data = [
        {
            "id": "usr_citizen_1",
            "username": "rajesh_sharma",
            "full_name": "Rajesh Kumar Sharma",
            "email": "rajesh.sharma@example.gov.in",
            "role": "CITIZEN",
            "department": "Citizen (Landowner - Owns 3 Properties)",
            "phone_masked": "+91 98XXX-XX101",
            "aadhaar_masked": "XXXX-XXXX-4589",
            "pan_masked": "ABFPS4589K"
        },
        {
            "id": "usr_citizen_2",
            "username": "priya_verma",
            "full_name": "Priya Verma",
            "email": "priya.verma@example.gov.in",
            "role": "CITIZEN",
            "department": "Citizen (Buyer/Owner)",
            "phone_masked": "+91 98XXX-XX202",
            "aadhaar_masked": "XXXX-XXXX-9912",
            "pan_masked": "CKLPV9912M"
        },
        {
            "id": "usr_citizen_3",
            "username": "amit_patel",
            "full_name": "Amit B. Patel",
            "email": "amit.patel@example.gov.in",
            "role": "CITIZEN",
            "department": "Citizen (Farmer/Landowner)",
            "phone_masked": "+91 97XXX-XX303",
            "aadhaar_masked": "XXXX-XXXX-7721",
            "pan_masked": "DHKPA7721L"
        },
        {
            "id": "usr_revenue_1",
            "username": "vikram_tehsildar",
            "full_name": "Vikramaditya Singh",
            "email": "v.singh.revenue@nic.in",
            "role": "REVENUE_OFFICER",
            "department": "Revenue Department (Tehsildar Office)",
            "phone_masked": "+91 94XXX-XX404",
            "aadhaar_masked": "XXXX-XXXX-1122",
            "pan_masked": "GOVRV1122A"
        },
        {
            "id": "usr_survey_1",
            "username": "ananya_surveyor",
            "full_name": "Ananya Deshmukh",
            "email": "a.deshmukh.survey@nic.in",
            "role": "SURVEY_OFFICER",
            "department": "Directorate of Land Records & Cadastral GIS",
            "phone_masked": "+91 94XXX-XX505",
            "aadhaar_masked": "XXXX-XXXX-3344",
            "pan_masked": "GOVSV3344B"
        },
        {
            "id": "usr_legal_1",
            "username": "suresh_legal",
            "full_name": "Suresh Nambiar",
            "email": "s.nambiar.law@nic.in",
            "role": "LEGAL_OFFICER",
            "department": "Legal Cell & e-Courts Registry Liaison",
            "phone_masked": "+91 94XXX-XX606",
            "aadhaar_masked": "XXXX-XXXX-5566",
            "pan_masked": "GOVLG5566C"
        },
        {
            "id": "usr_reg_1",
            "username": "meenakshi_sro",
            "full_name": "Meenakshi Sundaram",
            "email": "m.sundaram.sro@nic.in",
            "role": "REGISTRATION_OFFICER",
            "department": "Registration & Stamps Department (Sub-Registrar)",
            "phone_masked": "+91 94XXX-XX707",
            "aadhaar_masked": "XXXX-XXXX-7788",
            "pan_masked": "GOVRG7788D"
        },
        {
            "id": "usr_sdm_1",
            "username": "dr_arvind_sdm",
            "full_name": "Dr. Arvind Saxena, IAS",
            "email": "sdm.ghaziabad@up.gov.in",
            "role": "SDM_APPROVER",
            "department": "District Magistrate / SDM Court Administration",
            "phone_masked": "+91 94XXX-XX808",
            "aadhaar_masked": "XXXX-XXXX-9900",
            "pan_masked": "GOVSD9900E"
        },
        {
            "id": "usr_admin_1",
            "username": "nic_admin",
            "full_name": "National Informatics Centre Admin",
            "email": "admin.bhulekh@nic.in",
            "role": "ADMIN",
            "department": "Ministry of Rural Development & Digital India Land Records",
            "phone_masked": "+91 94XXX-XX000",
            "aadhaar_masked": "XXXX-XXXX-0000",
            "pan_masked": "NICAD0000Z"
        }
    ]

    for u in users_data:
        db.add(User(**u))
    db.commit()

    # 2. Seed Realistic Cadastral Parcels with Area in Sq. Ft. and Multi-State Authorities
    parcels_data = [
        # --- UTTAR PRADESH: GHAZIABAD CLUSTER ---
        # Parcel 1: Owned by Rajesh Sharma (TEST USER) - Clean Residential, NOT FOR SALE -> READY TO SELL / TRANSFER
        {
            "id": "UP-GZB-IND-00012345",
            "ulin_pin": "UP08GZB012345",
            "state": "Uttar Pradesh",
            "revenue_authority": "Board of Revenue, Uttar Pradesh (Bhulekh UP)",
            "district": "Ghaziabad",
            "tehsil": "Modinagar",
            "village": "Govindpuri",
            "khasra_no": "142/1",
            "khata_no": "89-A",
            "land_use": "Residential",
            "area_sqft": 4850.0,
            "area_sqm": 450.58,
            "area_local_unit": "0.11 Acres / 1.70 Bigha",
            "circle_rate_sqft_2026": 2600.0,
            "circle_rate_2026": 28000.0,
            "circle_rate_2025": 25500.0,
            "circle_rate_2024": 23000.0,
            "current_owner_id": "usr_citizen_1",
            "current_owner_name": "Rajesh Kumar Sharma",
            "is_for_sale": False,
            "listing_price_lakhs": None,
            "is_disputed": False,
            "is_mortgaged": False,
            "tax_cleared": True,
            "boundary_verified": True,
            "risk_rating": "LOW_RISK",
            "centroid_lat": 28.6720,
            "centroid_lng": 77.4520,
            "geometry_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [77.4510, 28.6710],
                    [77.4530, 28.6712],
                    [77.4532, 28.6730],
                    [77.4512, 28.6728],
                    [77.4510, 28.6710]
                ]]
            })
        },
        # Parcel 2: Owned by Rajesh Sharma (TEST USER) - Commercial, ALREADY LISTED FOR SALE -> READY TO TEST DELISTING / SELLING
        {
            "id": "UP-GZB-IND-00012346",
            "ulin_pin": "UP08GZB012346",
            "state": "Uttar Pradesh",
            "revenue_authority": "Board of Revenue, Uttar Pradesh (Bhulekh UP)",
            "district": "Ghaziabad",
            "tehsil": "Modinagar",
            "village": "Govindpuri",
            "khasra_no": "142/2",
            "khata_no": "89-B",
            "land_use": "Commercial",
            "area_sqft": 8600.0,
            "area_sqm": 798.96,
            "area_local_unit": "0.20 Acres / 3.01 Bigha",
            "circle_rate_sqft_2026": 3900.0,
            "circle_rate_2026": 42000.0,
            "circle_rate_2025": 38000.0,
            "circle_rate_2024": 34000.0,
            "current_owner_id": "usr_citizen_1",
            "current_owner_name": "Rajesh Kumar Sharma",
            "is_for_sale": True,
            "listing_price_lakhs": 335.0, # ₹3.35 Crores
            "is_disputed": False,
            "is_mortgaged": False,
            "tax_cleared": True,
            "boundary_verified": True,
            "risk_rating": "LOW_RISK",
            "centroid_lat": 28.6740,
            "centroid_lng": 77.4550,
            "geometry_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [77.4540, 28.6730],
                    [77.4560, 28.6732],
                    [77.4562, 28.6750],
                    [77.4542, 28.6748],
                    [77.4540, 28.6730]
                ]]
            })
        },
        # Parcel 3: Owned by Rajesh Sharma (TEST USER) - Varanasi Agricultural Land
        {
            "id": "UP-VNS-IND-00034189",
            "ulin_pin": "UP65VNS034189",
            "state": "Uttar Pradesh",
            "revenue_authority": "Board of Revenue, Uttar Pradesh (Bhulekh UP)",
            "district": "Varanasi",
            "tehsil": "Pindra",
            "village": "Babatpur",
            "khasra_no": "208",
            "khata_no": "34",
            "land_use": "Agricultural",
            "area_sqft": 24500.0,
            "area_sqm": 2276.12,
            "area_local_unit": "0.56 Acres / 4.10 Bigha",
            "circle_rate_sqft_2026": 1400.0,
            "circle_rate_2026": 15000.0,
            "circle_rate_2025": 13500.0,
            "circle_rate_2024": 12000.0,
            "current_owner_id": "usr_citizen_1",
            "current_owner_name": "Rajesh Kumar Sharma",
            "is_for_sale": False,
            "listing_price_lakhs": None,
            "is_disputed": False,
            "is_mortgaged": False,
            "tax_cleared": True,
            "boundary_verified": True,
            "risk_rating": "LOW_RISK",
            "centroid_lat": 25.3210,
            "centroid_lng": 82.9750,
            "geometry_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [82.9730, 25.3195],
                    [82.9770, 25.3198],
                    [82.9772, 25.3225],
                    [82.9732, 25.3222],
                    [82.9730, 25.3195]
                ]]
            })
        },
        # Parcel 4: GAUTAM BUDDHA NAGAR (NOIDA) - Active Court Dispute (HIGH RISK)
        {
            "id": "UP-GBN-IND-00045120",
            "ulin_pin": "UP09GBN045120",
            "state": "Uttar Pradesh",
            "revenue_authority": "Board of Revenue, Uttar Pradesh (Bhulekh UP)",
            "district": "Gautam Buddha Nagar",
            "tehsil": "Dadri",
            "village": "Surajpur",
            "khasra_no": "310",
            "khata_no": "44",
            "land_use": "Agricultural",
            "area_sqft": 48400.0,
            "area_sqm": 4500.0,
            "area_local_unit": "1.11 Acres / 7.25 Bigha",
            "circle_rate_sqft_2026": 1670.0,
            "circle_rate_2026": 18000.0,
            "circle_rate_2025": 16500.0,
            "circle_rate_2024": 15000.0,
            "current_owner_id": "usr_citizen_3",
            "current_owner_name": "Amit B. Patel",
            "is_for_sale": False,
            "listing_price_lakhs": None,
            "is_disputed": True,
            "dispute_case_no": "OS/142/2025 - Hon'ble High Court of Judicature at Allahabad",
            "dispute_details": "Title partition suit filed by co-heirs. Interim injunction in operation since Oct 2025 under Section 52 Transfer of Property Act.",
            "is_mortgaged": False,
            "tax_cleared": False,
            "boundary_verified": False,
            "risk_rating": "HIGH_RISK",
            "centroid_lat": 28.5380,
            "centroid_lng": 77.4850,
            "geometry_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [77.4830, 28.5365],
                    [77.4870, 28.5368],
                    [77.4872, 28.5395],
                    [77.4832, 28.5392],
                    [77.4830, 28.5365]
                ]]
            })
        },
        # Parcel 5: LUCKNOW - Bank Mortgage Encumbrance (REVIEW REQUIRED)
        {
            "id": "UP-LKO-IND-00098124",
            "ulin_pin": "UP32LKO098124",
            "state": "Uttar Pradesh",
            "revenue_authority": "Board of Revenue, Uttar Pradesh (Bhulekh UP)",
            "district": "Lucknow",
            "tehsil": "Bakshi Ka Talab",
            "village": "Kishunpur",
            "khasra_no": "512/3",
            "khata_no": "112",
            "land_use": "Industrial",
            "area_sqft": 34450.0,
            "area_sqm": 3200.5,
            "area_local_unit": "0.79 Acres",
            "circle_rate_sqft_2026": 2040.0,
            "circle_rate_2026": 22000.0,
            "circle_rate_2025": 19500.0,
            "circle_rate_2024": 17000.0,
            "current_owner_id": "usr_citizen_2",
            "current_owner_name": "Priya Verma",
            "is_for_sale": False,
            "listing_price_lakhs": None,
            "is_disputed": False,
            "is_mortgaged": True,
            "mortgage_bank": "State Bank of India (Hazratganj Commercial Branch)",
            "mortgage_amount_lakhs": 75.0, # ₹75 Lakhs
            "tax_cleared": True,
            "boundary_verified": True,
            "risk_rating": "REVIEW_REQUIRED",
            "centroid_lat": 26.8520,
            "centroid_lng": 80.9520,
            "geometry_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [80.9500, 26.8505],
                    [80.9540, 26.8508],
                    [80.9542, 26.8535],
                    [80.9502, 26.8532],
                    [80.9500, 26.8505]
                ]]
            })
        },
        # --- KARNATAKA: BENGALURU RURAL (BHOOMI PORTAL) ---
        # Parcel 6: Karnataka Bhoomi Registered Land
        {
            "id": "KA-BNG-IND-00067123",
            "ulin_pin": "KA04BNG067123",
            "state": "Karnataka",
            "revenue_authority": "Revenue Department, Government of Karnataka (Bhoomi Portal)",
            "district": "Bengaluru Rural",
            "tehsil": "Devanahalli",
            "village": "Binnamangala",
            "khasra_no": "45/2",
            "khata_no": "77",
            "land_use": "Industrial",
            "area_sqft": 66700.0,
            "area_sqm": 6196.6,
            "area_local_unit": "1.53 Acres / 61.2 Guntas",
            "circle_rate_sqft_2026": 5100.0,
            "circle_rate_2026": 55000.0,
            "circle_rate_2025": 49000.0,
            "circle_rate_2024": 43000.0,
            "current_owner_id": "usr_citizen_3",
            "current_owner_name": "Amit B. Patel",
            "is_for_sale": False,
            "listing_price_lakhs": None,
            "is_disputed": False,
            "is_mortgaged": False,
            "tax_cleared": True,
            "boundary_verified": True,
            "risk_rating": "LOW_RISK",
            "centroid_lat": 13.2450,
            "centroid_lng": 77.7120,
            "geometry_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [77.7100, 13.2435],
                    [77.7140, 13.2438],
                    [77.7142, 13.2465],
                    [77.7102, 13.2462],
                    [77.7100, 13.2435]
                ]]
            })
        },
        # Parcel 7: Karnataka Bengaluru Urban Residential Plot
        {
            "id": "KA-BNG-IND-00067124",
            "ulin_pin": "KA04BNG067124",
            "state": "Karnataka",
            "revenue_authority": "Revenue Department, Government of Karnataka (Bhoomi Portal)",
            "district": "Bengaluru Urban",
            "tehsil": "Yelahanka",
            "village": "Jakkur",
            "khasra_no": "112/1",
            "khata_no": "93",
            "land_use": "Residential",
            "area_sqft": 5400.0,
            "area_sqm": 501.67,
            "area_local_unit": "0.12 Acres / 5.0 Guntas",
            "circle_rate_sqft_2026": 6800.0,
            "circle_rate_2026": 73200.0,
            "circle_rate_2025": 65000.0,
            "circle_rate_2024": 58000.0,
            "current_owner_id": "usr_citizen_2",
            "current_owner_name": "Priya Verma",
            "is_for_sale": True,
            "listing_price_lakhs": 367.0, # ₹3.67 Crores
            "is_disputed": False,
            "is_mortgaged": False,
            "tax_cleared": True,
            "boundary_verified": True,
            "risk_rating": "LOW_RISK",
            "centroid_lat": 13.0780,
            "centroid_lng": 77.6050,
            "geometry_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [77.6030, 13.0765],
                    [77.6070, 13.0768],
                    [77.6072, 13.0795],
                    [77.6032, 13.0792],
                    [77.6030, 13.0765]
                ]]
            })
        },
        # --- MAHARASHTRA: PUNE (MAHABHULEKH) ---
        # Parcel 8: Maharashtra Mahabhulekh Registered Plot
        {
            "id": "MH-PUN-IND-00078120",
            "ulin_pin": "MH12PUN078120",
            "state": "Maharashtra",
            "revenue_authority": "Revenue & Forest Department, Government of Maharashtra (Mahabhulekh)",
            "district": "Pune",
            "tehsil": "Haveli",
            "village": "Wagholi",
            "khasra_no": "88/1A",
            "khata_no": "19",
            "land_use": "Residential",
            "area_sqft": 10225.0,
            "area_sqm": 950.0,
            "area_local_unit": "0.23 Acres / 9.5 Guntha",
            "circle_rate_sqft_2026": 4460.0,
            "circle_rate_2026": 48000.0,
            "circle_rate_2025": 44000.0,
            "circle_rate_2024": 40000.0,
            "current_owner_id": "usr_citizen_2",
            "current_owner_name": "Priya Verma",
            "is_for_sale": False,
            "listing_price_lakhs": None,
            "is_disputed": False,
            "is_mortgaged": False,
            "tax_cleared": True,
            "boundary_verified": True,
            "risk_rating": "LOW_RISK",
            "centroid_lat": 18.5250,
            "centroid_lng": 73.8610,
            "geometry_geojson": json.dumps({
                "type": "Polygon",
                "coordinates": [[
                    [73.8590, 18.5235],
                    [73.8630, 18.5238],
                    [73.8632, 18.5265],
                    [73.8592, 18.5262],
                    [73.8590, 18.5235]
                ]]
            })
        }
    ]

    for p in parcels_data:
        db.add(Parcel(**p))
    db.commit()

    # 3. Seed Ownership History
    histories = [
        {
            "parcel_id": "UP-GZB-IND-00012345",
            "year": 1998,
            "previous_owner_name": "State Land Allotment Board (UP Govt)",
            "new_owner_name": "Ramesh Chandra Sharma",
            "transfer_type": "ORIGINAL_ALLOTMENT",
            "transaction_value_lakhs": 4.5,
            "registration_number": "REG-GZB/1998/0042",
            "registration_date": "1998-04-12",
            "document_hash": calculate_sha256("DEED-1998-GZB-0042"),
            "ledger_tx_hash": calculate_sha256("TX-1998-GZB-0042"),
            "approving_authority": "Tehsildar & SRO Ghaziabad"
        },
        {
            "parcel_id": "UP-GZB-IND-00012345",
            "year": 2014,
            "previous_owner_name": "Ramesh Chandra Sharma",
            "new_owner_name": "Rajesh Kumar Sharma",
            "transfer_type": "INHERITANCE",
            "transaction_value_lakhs": 42.0,
            "registration_number": "MUT-GZB/2014/1109",
            "registration_date": "2014-08-20",
            "document_hash": calculate_sha256("DEED-2014-GZB-1109"),
            "ledger_tx_hash": calculate_sha256("TX-2014-GZB-1109"),
            "approving_authority": "Revenue Court / SDM Modinagar"
        },
        {
            "parcel_id": "UP-LKO-IND-00098124",
            "year": 2018,
            "previous_owner_name": "Om Prakash Verma",
            "new_owner_name": "Priya Verma",
            "transfer_type": "GIFT_DEED",
            "transaction_value_lakhs": 55.0,
            "registration_number": "REG-LKO/2018/8892",
            "registration_date": "2018-11-05",
            "document_hash": calculate_sha256("DEED-2018-LKO-8892"),
            "ledger_tx_hash": calculate_sha256("TX-2018-LKO-8892"),
            "approving_authority": "Sub-Registrar Hazratganj Lucknow"
        }
    ]

    for h in histories:
        db.add(OwnershipHistory(**h))
    db.commit()

    # 4. Seed Permissioned Blockchain Genesis & Initial Blocks
    genesis_payload = {
        "network": "Bhulekh Sovereign Permissioned Land Ledger",
        "jurisdiction": "Republic of India - Digital Land Record Modernization Programme",
        "genesis_epoch": "2026-01-01T00:00:00Z",
        "consensus": "Statutory Authority Multi-Sign Proof-of-Statute",
        "root_authority": "National Informatics Centre (NIC)"
    }
    genesis_dict = BhulekhLedgerEngine.create_block(
        block_index=0,
        parcel_id="SYSTEM-GENESIS-0000",
        event_type="GENESIS_SYSTEM_BOOTSTRAP",
        payload=genesis_payload,
        previous_hash="0" * 64,
        officer_signatures=[{
            "officer_id": "NIC-CENTRAL-ROOT",
            "role": "SYSTEM_ROOT",
            "action": "BOOTSTRAP_GENESIS",
            "pubkey_fingerprint": "GOV-PKI-NIC-ROOT-2026",
            "signature_digest": calculate_sha256("NIC_GENESIS_ROOT_DIGEST_2026")
        }],
        custom_timestamp=datetime.datetime(2026, 1, 1, 0, 0, 0)
    )
    db.add(LedgerBlock(**genesis_dict))

    block1_payload = {
        "parcel_id": "UP-GZB-IND-00012345",
        "ulin_pin": "UP08GZB012345",
        "state": "Uttar Pradesh",
        "district": "Ghaziabad",
        "current_owner_salt": calculate_sha256("Rajesh Kumar Sharma" + "GOV_SALT_2026")[:24],
        "khasra_no": "142/1",
        "area_sqft": 4850.0,
        "declared_valuation_lakhs": 126.1,
        "mutation_order_ref": "MUT-GZB/2014/1109",
        "status": "STATUTORY_TITLE_COMMITTED"
    }
    block1_dict = BhulekhLedgerEngine.create_block(
        block_index=1,
        parcel_id="UP-GZB-IND-00012345",
        event_type="MINT_PARCEL_IDENTITY",
        payload=block1_payload,
        previous_hash=genesis_dict["block_hash"],
        officer_signatures=[
            create_digital_signature("usr_revenue_1", "REVENUE_OFFICER", "VERIFY_KHASRA", "UP-GZB-IND-00012345", "2026-01-15T10:00:00Z"),
            create_digital_signature("usr_sdm_1", "SDM_APPROVER", "APPROVE_TITLE", "UP-GZB-IND-00012345", "2026-01-15T16:00:00Z")
        ],
        document_hashes=[calculate_sha256("DEED-2014-GZB-1109")],
        custom_timestamp=datetime.datetime(2026, 1, 15, 16, 0, 0)
    )
    db.add(LedgerBlock(**block1_dict))
    db.commit()

    # 5. Seed Applications
    # App 1: Pending under review (Stage 0: Revenue)
    app1_id = "APP-2026-GZB-0101"
    app1 = Application(
        id=app1_id,
        parcel_id="UP-GZB-IND-00012346",
        applicant_id="usr_citizen_1",
        buyer_id="usr_citizen_2",
        buyer_name="Priya Verma",
        buyer_masked_aadhaar="XXXX-XXXX-9912",
        buyer_phone_masked="+91 98XXX-XX202",
        transfer_type="SALE_DEED_MUTATION",
        declared_value_lakhs=330.0, # ₹3.30 Crores
        stamp_duty_paid_lakhs=23.10,
        current_stage_index=0,
        status="UNDER_REVIEW",
        created_at=now - datetime.timedelta(days=2),
        updated_at=now - datetime.timedelta(days=2),
        sla_deadline=now + datetime.timedelta(days=19),
        is_sla_breached=False,
        supervisor_notified=False
    )
    db.add(app1)
    db.flush()

    for idx, cfg in STAGE_SLA_CONFIG.items():
        stage = ApplicationStage(
            application_id=app1_id,
            stage_order=idx,
            stage_name=cfg["name"],
            department=cfg["department"],
            assigned_role=cfg["role"],
            assigned_officer_id=f"usr_{cfg['role'][:3].lower()}_1",
            assigned_officer_name=f"Officer ({cfg['role'].replace('_', ' ').title()})",
            status="IN_PROGRESS" if idx == 0 else "PENDING",
            sla_days=cfg["sla_days"],
            assigned_at=now - datetime.timedelta(days=2) if idx == 0 else (now + datetime.timedelta(days=idx * 4)),
            deadline_at=(now - datetime.timedelta(days=2)) + datetime.timedelta(days=cfg["sla_days"]) if idx == 0 else (now + datetime.timedelta(days=(idx + 1) * 4))
        )
        db.add(stage)

    # App 2: Rejected (Boundary overlap)
    app2_id = "APP-2026-GBN-0102"
    app2 = Application(
        id=app2_id,
        parcel_id="UP-GBN-IND-00045120",
        applicant_id="usr_citizen_3",
        buyer_id="usr_citizen_1",
        buyer_name="Rajesh Kumar Sharma",
        buyer_masked_aadhaar="XXXX-XXXX-4589",
        buyer_phone_masked="+91 98XXX-XX101",
        transfer_type="SALE_DEED_MUTATION",
        declared_value_lakhs=82.0,
        stamp_duty_paid_lakhs=5.74,
        current_stage_index=1,
        status="REJECTED",
        created_at=now - datetime.timedelta(days=10),
        updated_at=now - datetime.timedelta(days=3),
        sla_deadline=now + datetime.timedelta(days=11),
        is_sla_breached=False,
        supervisor_notified=False,
        rejection_category="Cadastral boundary overlap or encroachment",
        rejection_remarks="DGPS ground survey report dated 25-Aug-2026 reveals a 4.2 meter western boundary overlap with Gaon Sabha public road (Khasra 311). Mutation cannot proceed until boundary demarcation settlement is filed.",
        rejection_officer_name="Ananya Deshmukh (Cadastral GIS Surveyor)",
        rejection_department="Department of Land Records & Survey",
        rejected_at=now - datetime.timedelta(days=3)
    )
    db.add(app2)
    db.flush()

    for idx, cfg in STAGE_SLA_CONFIG.items():
        st_status = "APPROVED" if idx == 0 else ("REJECTED" if idx == 1 else "PENDING")
        stage = ApplicationStage(
            application_id=app2_id,
            stage_order=idx,
            stage_name=cfg["name"],
            department=cfg["department"],
            assigned_role=cfg["role"],
            assigned_officer_id=f"usr_{cfg['role'][:3].lower()}_1",
            assigned_officer_name=f"Officer ({cfg['role'].replace('_', ' ').title()})",
            status=st_status,
            sla_days=cfg["sla_days"],
            assigned_at=now - datetime.timedelta(days=10),
            deadline_at=now - datetime.timedelta(days=3),
            completed_at=now - datetime.timedelta(days=3) if idx <= 1 else None,
            officer_remarks="Verified in order" if idx == 0 else ("Boundary overlap with Khasra 311 detected" if idx == 1 else None)
        )
        db.add(stage)

    # App 3: SLA Breached Application (Overdue at Revenue Stage)
    app3_id = "APP-2026-LKO-0103"
    past_assigned = now - datetime.timedelta(days=12)
    past_deadline = past_assigned + datetime.timedelta(days=7)
    app3 = Application(
        id=app3_id,
        parcel_id="UP-LKO-IND-00098124",
        applicant_id="usr_citizen_2",
        buyer_id="usr_citizen_3",
        buyer_name="Amit B. Patel",
        buyer_masked_aadhaar="XXXX-XXXX-7721",
        buyer_phone_masked="+91 97XXX-XX303",
        transfer_type="SALE_DEED_MUTATION",
        declared_value_lakhs=68.0,
        stamp_duty_paid_lakhs=4.76,
        current_stage_index=0,
        status="UNDER_REVIEW",
        created_at=past_assigned,
        updated_at=now,
        sla_deadline=past_assigned + datetime.timedelta(days=21),
        is_sla_breached=True,
        supervisor_notified=True,
        sla_breach_notified_at=now - datetime.timedelta(days=5),
        delay_explanation="Patwari field inspection was delayed due to regional monsoon waterlogging in Bakshi Ka Talab sector. Spot inspection scheduled for immediate completion."
    )
    db.add(app3)
    db.flush()

    for idx, cfg in STAGE_SLA_CONFIG.items():
        stage = ApplicationStage(
            application_id=app3_id,
            stage_order=idx,
            stage_name=cfg["name"],
            department=cfg["department"],
            assigned_role=cfg["role"],
            assigned_officer_id=f"usr_{cfg['role'][:3].lower()}_1",
            assigned_officer_name=f"Officer ({cfg['role'].replace('_', ' ').title()})",
            status="SLA_BREACHED" if idx == 0 else "PENDING",
            sla_days=cfg["sla_days"],
            assigned_at=past_assigned if idx == 0 else now,
            deadline_at=past_deadline if idx == 0 else (now + datetime.timedelta(days=cfg["sla_days"]))
        )
        db.add(stage)

    # 6. Seed Audit Events
    audit_events_data = [
        {
            "entity_type": "LEDGER",
            "entity_id": "SYSTEM-GENESIS-0000",
            "actor_name": "NIC Central Root CA",
            "actor_role": "SYSTEM_ROOT",
            "action": "BOOTSTRAP_GENESIS",
            "details": "Initialized Bhulekh Sovereign Permissioned Land Ledger node #NIC-DLRP-01."
        },
        {
            "entity_type": "APPLICATION",
            "entity_id": "APP-2026-GZB-0101",
            "actor_name": "Rajesh Kumar Sharma",
            "actor_role": "CITIZEN",
            "action": "APPLICATION_SUBMITTED",
            "details": "Submitted ownership mutation application for Parcel 'UP-GZB-IND-00012346' in favor of Priya Verma. Declared Value: ₹330.00 Lakhs (₹3.30 Cr)."
        },
        {
            "entity_type": "SLA",
            "entity_id": "APP-2026-LKO-0103",
            "actor_name": "GovLand Automated SLA Monitor",
            "actor_role": "SYSTEM_DAEMON",
            "action": "SLA_BREACH_ESCALATION",
            "details": "Stage 'Revenue Record & Jamabandi Verification' exceeded statutory SLA deadline. Escalation dispatched to District Magistrate supervisory console."
        }
    ]

    for a in audit_events_data:
        db.add(AuditEvent(**a))

    db.commit()
    db.close()
    print("Database successfully reseeded with sqft areas and updated state authorities!")

if __name__ == "__main__":
    seed_database()
