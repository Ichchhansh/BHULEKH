# BHULEKH LEDGER (भूलेख लेज़र)
### Verifiable Digital Land Governance & Sovereign Ownership Infrastructure

A secure, parcel-centric, permissioned blockchain-backed digital land governance and ownership management platform prototype designed for the Indian administrative and statutory land governance ecosystem.

---

## 1. Core Architectural Principles

1. **Statutory Government Verification as Legal Source of Truth**:
   The platform establishes that **blockchain alone does not create legal land titles**. Legal ownership authority is created through statutory administrative clearance by designated Revenue, Survey, Legal, and Registration authorities. The cryptographic ledger provides an immutable, mathematically verifiable audit trail and transaction provenance.

2. **Privacy by Design & Off-Chain PII Isolation**:
   No sensitive personal identity information (Aadhaar numbers, PAN cards, biometrics, phone numbers, or raw deed scans) is stored on-chain.
   - Raw deeds and KYC proofs reside in secure off-chain government databases.
   - The ledger records cryptographic SHA-256 fingerprints: `SHA256(deed)`, `SHA256(owner_salt)`, `Parcel_UUID`, timestamp, approving officer digital signatures, and Merkle root proofs.

3. **Parcel-Centric Central Identity**:
   Every land parcel receives a Unique Land Parcel Identification Number (ULPIN / Bhu-Aadhaar), e.g. `UP-GZB-IND-00012345`. All boundaries, historical deeds, circle rates, dispute flags, mortgages, and applications link directly to this primary identity.

---

## 2. Multi-Role Government Authority Model

The application includes an instant **Role Switcher** in the top header to demo the complete governance lifecycle across 7 administrative personas:

- 🧑‍🌾 **Citizen (Landowner / Buyer)** — Rajesh Kumar Sharma (Owner of properties in Ghaziabad & Varanasi)
- 🌾 **Revenue Officer (Patwari / Tehsildar)** — Vikramaditya Singh
- 📐 **Cadastral GIS Surveyor** — Ananya Deshmukh
- ⚖️ **Legal / e-Courts Officer** — Suresh Nambiar
- 📜 **Sub-Registrar (SRO)** — Meenakshi Sundaram
- 🏛️ **SDM / District Collector (Approving Authority)** — Dr. Arvind Saxena, IAS
- 🛡️ **NIC System Administrator** — Central GovNet Node Admin

---

## 3. Key Feature Modules

### 🗺️ Interactive Cadastral GIS Map
- GeoJSON polygon boundary rendering powered by Leaflet.
- Color-coded parcels:
  - 🟢 **Clean Verified Title** (Emerald)
  - 🟣 **Marked Available for Sale** (Purple)
  - 🟡 **Mortgaged / Bank Lien** (Amber)
  - 🔴 **Active Court Injunction / Disputed** (Red)
- Side drawer displaying Khasra/Khata details, historical Circle Rates (2024, 2025, 2026), Government Reference Valuation (`Area × Circle Rate`), clearance matrix, and ownership timeline.

### ⏱️ Statutory SLA Engine & Automated Escalation
- Every verification stage has an enforced statutory deadline (e.g. Revenue: 7 days, Survey: 5 days, Legal: 3 days, SRO: 4 days, SDM: 2 days).
- If a deadline is exceeded:
  - Application is automatically stamped `⚠ SLA BREACHED`.
  - Immutable escalation audit event is logged.
  - Notice is dispatched to District Magistrate / SDM supervisory console.
  - The assigned officer is mandated to submit a formal delay explanation.

### ❌ Structured Rejection & Citizen Appeal System
- Officers cannot reject arbitrarily without statutory cause.
- Mandatory selection from 11 structured rejection categories (e.g. *Cadastral boundary overlap*, *Ownership mismatch*, *Pending court dispute*, *Area discrepancy*).
- Citizen can view the exact ground of rejection and choose to either **Submit Rectified Documents** or **File Formal Appeal to District Collector**.

### ⛓️ Permissioned Cryptographic Ledger & Live Tamper Simulator
- Deterministic SHA-256 block hashing with parent block linking and Merkle tree roots.
- Live **Tamper Detection Simulation**: Allows you to simulate an unauthorized SQL database alteration on any block and watch the cryptographic audit engine instantly catch and pinpoint the exact corrupted block index!
- "Restore Pristine State" one-click button.

### 📑 Record of Rights (RoR / Khatauni) Generator
- Instant digital passbook extract with official Board of Revenue watermark, QR code, and NIC digital signature stamp.

---

## 4. Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide Icons, Leaflet GIS, React-Leaflet
- **Backend**: Python 3.13, FastAPI, SQLAlchemy, SQLite (PostGIS-compatible schema)
- **Cryptography**: Standard SHA-256, Merkle Tree Root Computation, Simulated X.509 NIC DSC Digital Signatures
- **Architecture**: REST API with complete CORS enablement and automatic schema validation

---

## 5. Quick Start Instructions

### Option 1: Single-Command Launch (Recommended)
```bash
cd /Users/ishu/.gemini/antigravity/scratch/bhulekh-ledger
./start.sh
```

### Option 2: Manual Start

**Backend**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_data.py
uvicorn main:app --port 8000 --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 6. Automated Testing

Run the backend pytest test suite covering API verification, tamper detection, and end-to-end mutation workflow:
```bash
cd backend
./venv/bin/pytest test_api.py -v
```
