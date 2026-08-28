const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  phone_masked: string;
  aadhaar_masked: string;
  pan_masked: string;
}

export interface Parcel {
  id: string;
  ulin_pin: string;
  state: string;
  revenue_authority: string;
  district: string;
  tehsil: string;
  village: string;
  khasra_no: string;
  khata_no: string;
  land_use: string;
  area_sqft: number;
  area_sqm: number;
  area_local_unit: string;
  circle_rate_sqft_2026: number;
  circle_rate_2026: number;
  circle_rate_2025: number;
  circle_rate_2024: number;
  estimated_govt_value_lakhs: number;
  formatted_value_str: string;
  ownership_status: string;
  current_owner_id?: string;
  current_owner_name?: string;
  is_for_sale: boolean;
  listing_price_lakhs?: number;
  is_disputed: boolean;
  dispute_case_no?: string;
  dispute_details?: string;
  is_mortgaged: boolean;
  mortgage_bank?: string;
  mortgage_amount_lakhs?: number;
  tax_cleared: boolean;
  boundary_verified: boolean;
  risk_rating: 'LOW_RISK' | 'REVIEW_REQUIRED' | 'HIGH_RISK';
  centroid_lat: number;
  centroid_lng: number;
  geometry_geojson: string;
  ownership_history?: OwnershipHistory[];
  documents?: DocumentRecord[];
}

export interface OwnershipHistory {
  id: number;
  year: number;
  previous_owner_name?: string;
  new_owner_name: string;
  transfer_type: string;
  transaction_value_lakhs: number;
  registration_number: string;
  registration_date: string;
  document_hash?: string;
  ledger_tx_hash?: string;
  approving_authority: string;
}

export interface DocumentRecord {
  id: string;
  application_id?: string;
  parcel_id: string;
  doc_type: string;
  title: string;
  file_name: string;
  file_size_kb: number;
  mime_type: string;
  sha256_hash: string;
  verification_status: string;
  uploaded_by: string;
  uploaded_at: string;
  remarks?: string;
}

export interface ApplicationStage {
  id: number;
  stage_order: number;
  stage_name: string;
  department: string;
  assigned_role: string;
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  status: string;
  sla_days: number;
  assigned_at: string;
  deadline_at: string;
  completed_at?: string;
  officer_remarks?: string;
  digital_signature?: string;
  time_remaining_str?: string;
  is_breached?: boolean;
}

export interface ApplicationRecord {
  id: string;
  parcel_id: string;
  applicant_id: string;
  applicant_name?: string;
  buyer_name: string;
  buyer_masked_aadhaar: string;
  buyer_phone_masked: string;
  transfer_type: string;
  declared_value_lakhs: number;
  formatted_declared_value: string;
  stamp_duty_paid_lakhs: number;
  current_stage_index: number;
  status: string;
  created_at: string;
  sla_deadline: string;
  is_sla_breached: boolean;
  supervisor_notified: boolean;
  delay_explanation?: string;
  rejection_category?: string;
  rejection_remarks?: string;
  rejection_officer_name?: string;
  rejection_department?: string;
  rejected_at?: string;
  is_appealed: boolean;
  appeal_remarks?: string;
  appealed_at?: string;
  appeal_status?: string;
  final_ledger_block_index?: number;
  final_ledger_tx_hash?: string;
  parcel_district?: string;
  parcel_village?: string;
  parcel?: Parcel;
  stages?: ApplicationStage[];
  documents?: DocumentRecord[];
}

export interface LedgerBlock {
  block_index: number;
  timestamp: string;
  parcel_id: string;
  event_type: string;
  payload_json: string;
  payload_hash: string;
  previous_hash: string;
  merkle_root: string;
  officer_signatures: string;
  block_hash: string;
  nonce: number;
}

export interface AuditEvent {
  id: number;
  entity_type: string;
  entity_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
}

export interface OfficerStats {
  total_assigned: number;
  pending: number;
  approved: number;
  rejected: number;
  sla_approaching: number;
  sla_breached: number;
  appeals: number;
  disputed_parcels: number;
}

export const api = {
  getUsers: async (role?: string): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users${role ? `?role=${role}` : ''}`);
    return res.json();
  },
  
  getParcels: async (params: Record<string, string | boolean | undefined> = {}): Promise<Parcel[]> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const res = await fetch(`${API_BASE}/parcels?${searchParams.toString()}`);
    return res.json();
  },

  getParcelDetail: async (id: string): Promise<Parcel> => {
    const res = await fetch(`${API_BASE}/parcels/${id}`);
    if (!res.ok) throw new Error('Failed to fetch parcel detail');
    return res.json();
  },

  toggleListing: async (parcelId: string, isForSale: boolean, listingPriceLakhs?: number, actorName?: string) => {
    const res = await fetch(`${API_BASE}/parcels/${parcelId}/toggle-listing?actor_name=${encodeURIComponent(actorName || 'Citizen Landowner')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_for_sale: isForSale, listing_price_lakhs: listingPriceLakhs })
    });
    return res.json();
  },

  getApplications: async (params: Record<string, string | boolean | undefined> = {}): Promise<ApplicationRecord[]> => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const res = await fetch(`${API_BASE}/applications?${searchParams.toString()}`);
    return res.json();
  },

  getApplicationDetail: async (id: string): Promise<ApplicationRecord> => {
    const res = await fetch(`${API_BASE}/applications/${id}`);
    if (!res.ok) throw new Error('Failed to fetch application detail');
    return res.json();
  },

  submitApplication: async (payload: any, applicantId: string = 'usr_citizen_1'): Promise<ApplicationRecord> => {
    const res = await fetch(`${API_BASE}/applications?applicant_id=${applicantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to submit application');
    }
    return res.json();
  },

  officerAction: async (applicationId: string, payload: any): Promise<ApplicationRecord> => {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/officer-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to execute officer action');
    }
    return res.json();
  },

  citizenCorrection: async (applicationId: string, payload: any, actorName: string): Promise<ApplicationRecord> => {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/citizen-correction?actor_name=${encodeURIComponent(actorName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to submit correction');
    }
    return res.json();
  },

  citizenAppeal: async (applicationId: string, appealRemarks: string, actorName: string): Promise<ApplicationRecord> => {
    const res = await fetch(`${API_BASE}/applications/${applicationId}/citizen-appeal?actor_name=${encodeURIComponent(actorName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appeal_remarks: appealRemarks })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to file appeal');
    }
    return res.json();
  },

  getLedgerBlocks: async (parcelId?: string): Promise<LedgerBlock[]> => {
    const res = await fetch(`${API_BASE}/ledger/blocks${parcelId ? `?parcel_id=${parcelId}` : ''}`);
    return res.json();
  },

  verifyLedgerChain: async () => {
    const res = await fetch(`${API_BASE}/ledger/verify-chain`);
    return res.json();
  },

  simulateTamper: async (blockIndex: number, field: string, value: string) => {
    const res = await fetch(`${API_BASE}/ledger/simulate-tamper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        block_index: blockIndex,
        tampered_payload_field: field,
        fraudulent_value: value
      })
    });
    return res.json();
  },

  resetTamper: async () => {
    const res = await fetch(`${API_BASE}/ledger/reset-tamper`, { method: 'POST' });
    return res.json();
  },

  getAuditEvents: async (entityId?: string): Promise<AuditEvent[]> => {
    const res = await fetch(`${API_BASE}/audit-events${entityId ? `?entity_id=${entityId}` : ''}`);
    return res.json();
  },

  getOfficerStats: async (): Promise<OfficerStats> => {
    const res = await fetch(`${API_BASE}/stats/officer-dashboard`);
    return res.json();
  },

  getCitizenStats: async (userId: string) => {
    const res = await fetch(`${API_BASE}/stats/citizen-dashboard/${userId}`);
    return res.json();
  },

  getSlaRules: async () => {
    const res = await fetch(`${API_BASE}/config/sla-rules`);
    return res.json();
  }
};
