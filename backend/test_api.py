import pytest
from fastapi.testclient import TestClient
from main import app
import seed_data

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    seed_data.seed_database()

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "OPERATIONAL"

def test_parcels_list_and_filter():
    res = client.get("/api/parcels")
    assert res.status_code == 200
    parcels = res.json()
    assert len(parcels) >= 7
    
    # Filter by state
    res_up = client.get("/api/parcels?state=Uttar Pradesh")
    assert res_up.status_code == 200
    assert len(res_up.json()) >= 5

def test_parcel_detail_and_authorities():
    # Check UP parcel
    res_up = client.get("/api/parcels/UP-GZB-IND-00012345")
    assert res_up.status_code == 200
    data_up = res_up.json()
    assert "Uttar Pradesh" in data_up["revenue_authority"]
    assert data_up["area_sqft"] == 4850.0

    # Check Karnataka parcel
    res_ka = client.get("/api/parcels/KA-BNG-IND-00067123")
    assert res_ka.status_code == 200
    data_ka = res_ka.json()
    assert "Government of Karnataka" in data_ka["revenue_authority"]

def test_public_search_privacy():
    res = client.get("/api/parcels?search=Govindpuri")
    assert res.status_code == 200
    parcels = res.json()
    assert len(parcels) > 0
    first = parcels[0]
    assert "aadhaar" not in first
    assert "pan" not in first

def test_blockchain_ledger_verification_and_tamper_detection():
    # 1. Verify clean chain
    res = client.get("/api/ledger/verify-chain")
    assert res.status_code == 200
    assert res.json()["is_valid"] is True

    # 2. Simulate tampering with Block #1
    tamper_res = client.post("/api/ledger/simulate-tamper", json={
        "block_index": 1,
        "tampered_payload_field": "status",
        "fraudulent_value": "FRAUDULENT_TAMPERED_ENTRY"
    })
    assert tamper_res.status_code == 200
    tamper_data = tamper_res.json()
    assert tamper_data["verification_result"]["is_valid"] is False
    assert tamper_data["verification_result"]["corrupted_at_index"] == 1

    # 3. Reset ledger
    reset_res = client.post("/api/ledger/reset-tamper")
    assert reset_res.status_code == 200
    
    # Verify chain is clean again
    verify_again = client.get("/api/ledger/verify-chain")
    assert verify_again.json()["is_valid"] is True

def test_application_workflow_approval_to_block_minting():
    # Submit application
    create_payload = {
        "parcel_id": "UP-GZB-IND-00012345",
        "buyer_name": "Siddharth Malhotra",
        "buyer_masked_aadhaar": "XXXX-XXXX-3312",
        "buyer_phone_masked": "+91 99XXX-XX111",
        "transfer_type": "SALE_DEED_MUTATION",
        "declared_value_lakhs": 85.0,
        "stamp_duty_paid_lakhs": 5.95,
        "documents": [
            {
                "doc_type": "SALE_DEED",
                "title": "Registered Sale Deed",
                "file_name": "Deed_Siddharth_2026.pdf"
            }
        ]
    }
    create_res = client.post("/api/applications?applicant_id=usr_citizen_1", json=create_payload)
    assert create_res.status_code == 200
    app_data = create_res.json()
    app_id = app_data["id"]

    # Step 0: Revenue Officer Approves
    r0 = client.post(f"/api/applications/{app_id}/officer-action", json={
        "action": "APPROVE",
        "officer_id": "usr_revenue_1",
        "officer_name": "Vikramaditya Singh",
        "role": "REVENUE_OFFICER",
        "remarks": "Revenue records verified and verified clear."
    })
    assert r0.status_code == 200

    # Step 1: Survey Officer Approves
    r1 = client.post(f"/api/applications/{app_id}/officer-action", json={
        "action": "APPROVE",
        "officer_id": "usr_survey_1",
        "officer_name": "Ananya Deshmukh",
        "role": "SURVEY_OFFICER",
        "remarks": "Cadastral boundaries verified on GIS map."
    })
    assert r1.status_code == 200

    # Step 2: Legal Officer Approves
    r2 = client.post(f"/api/applications/{app_id}/officer-action", json={
        "action": "APPROVE",
        "officer_id": "usr_legal_1",
        "officer_name": "Suresh Nambiar",
        "role": "LEGAL_OFFICER",
        "remarks": "No pending court disputes or bank charges found."
    })
    assert r2.status_code == 200

    # Step 3: Registration Officer Approves
    r3 = client.post(f"/api/applications/{app_id}/officer-action", json={
        "action": "APPROVE",
        "officer_id": "usr_reg_1",
        "officer_name": "Meenakshi Sundaram",
        "role": "REGISTRATION_OFFICER",
        "remarks": "Registered sale deed and stamp duty verified."
    })
    assert r3.status_code == 200

    # Step 4: SDM Final Approves -> Should Mint Block & Update Parcel Owner!
    r4 = client.post(f"/api/applications/{app_id}/officer-action", json={
        "action": "APPROVE",
        "officer_id": "usr_sdm_1",
        "officer_name": "Dr. Arvind Saxena, IAS",
        "role": "SDM_APPROVER",
        "remarks": "Statutory mutation approved. Executive order issued."
    })
    assert r4.status_code == 200
    final_data = r4.json()
    assert final_data["status"] == "APPROVED"
    assert final_data["final_ledger_block_index"] is not None

    # Verify parcel owner updated
    p_res = client.get("/api/parcels/UP-GZB-IND-00012345")
    assert p_res.status_code == 200
    assert p_res.json()["current_owner_name"] == "Siddharth Malhotra"
