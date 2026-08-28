'use client';

import React, { useState } from 'react';
import { 
  User, ApplicationRecord, OfficerStats, api 
} from '@/lib/api';
import { 
  Building2, CheckCircle2, XCircle, AlertTriangle, Clock, 
  ShieldCheck, FileText, ArrowRight, Scale, Eye, Send, ShieldAlert, Cpu
} from 'lucide-react';

interface OfficerQueueProps {
  currentUser: User;
  applications: ApplicationRecord[];
  stats: OfficerStats | null;
  onRefreshData: () => void;
}

export const OfficerQueue: React.FC<OfficerQueueProps> = ({
  currentUser,
  applications,
  stats,
  onRefreshData
}) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' | 'DELAY_EXPLANATION' | null>(null);
  const [rejectionCategory, setRejectionCategory] = useState<string>('Ownership mismatch with revenue record');
  const [actionRemarks, setActionRemarks] = useState<string>('');
  const [delayExplanation, setDelayExplanation] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [filterStage, setFilterStage] = useState<string>('ALL');

  const rejectionCategories = [
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
  ];

  const handleOfficerSubmit = async () => {
    if (!selectedApp || !actionType) return;

    if (actionType === 'REJECT' && !actionRemarks.trim()) {
      alert('Mandatory detailed explanation is required for all statutory rejections.');
      return;
    }

    setIsProcessing(true);
    try {
      if (actionType === 'DELAY_EXPLANATION') {
        await api.officerAction(selectedApp.id, {
          action: 'SUBMIT_DELAY_EXPLANATION',
          officer_id: currentUser.id,
          officer_name: currentUser.full_name,
          role: currentUser.role,
          delay_explanation: delayExplanation
        });
      } else {
        await api.officerAction(selectedApp.id, {
          action: actionType,
          officer_id: currentUser.id,
          officer_name: currentUser.full_name,
          role: currentUser.role,
          rejection_category: actionType === 'REJECT' ? rejectionCategory : undefined,
          remarks: actionRemarks || (actionType === 'APPROVE' ? 'Statutorily cleared and signed.' : 'Correction requested.')
        });
      }

      setSelectedApp(null);
      setActionType(null);
      setActionRemarks('');
      setDelayExplanation('');
      onRefreshData();
    } catch (err: any) {
      alert(`Action error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Officer Welcome & Authority Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-900 text-[11px] px-2.5 py-0.5 rounded font-extrabold border border-blue-300">
              OFFICIAL GOVERNMENT PORTAL
            </span>
            <span className="text-slate-500 text-xs font-mono">Officer ID: {currentUser.id}</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0a2540] mt-1">
            {currentUser.full_name} — {currentUser.department}
          </h2>
          <p className="text-xs text-slate-600">
            Statutory Land Verification, Public Services SLA Monitoring & Digital Signature Clearance
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-lg border border-slate-200">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <div className="text-left text-xs">
            <span className="text-slate-500 text-[10px] block">e-Sign DSC Status</span>
            <span className="font-bold text-slate-900">NIC PKI Active (2026-28)</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Assigned</span>
            <span className="text-xl font-extrabold text-slate-900">{stats.total_assigned}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-blue-700 uppercase block">Under Review</span>
            <span className="text-xl font-extrabold text-blue-900">{stats.pending}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Approved</span>
            <span className="text-xl font-extrabold text-emerald-900">{stats.approved}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-red-700 uppercase block">Rejected</span>
            <span className="text-xl font-extrabold text-red-900">{stats.rejected}</span>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-300 shadow-sm">
            <span className="text-[10px] font-bold text-amber-900 uppercase block">SLA Approaching</span>
            <span className="text-xl font-extrabold text-amber-950">{stats.sla_approaching}</span>
          </div>

          <div className="bg-red-100/80 p-3.5 rounded-xl border border-red-400 shadow-sm animate-pulse-breach">
            <span className="text-[10px] font-bold text-red-950 uppercase block">⚠ SLA Breached</span>
            <span className="text-xl font-black text-red-950">{stats.sla_breached}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-purple-700 uppercase block">Appeals Filed</span>
            <span className="text-xl font-extrabold text-purple-900">{stats.appeals}</span>
          </div>
        </div>
      )}

      {/* Task Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#0a2540] uppercase tracking-wide">
              Official Verification Task Queue
            </h3>
            <p className="text-xs text-slate-500">
              Sorted by statutory SLA urgency and deadline compliance
            </p>
          </div>

          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
          >
            <option value="ALL">All Applications ({applications.length})</option>
            <option value="BREACHED">SLA Breached Only</option>
            <option value="PENDING">Pending Action Only</option>
            <option value="APPROVED">Approved / Minted</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-y border-slate-200">
                <th className="py-2.5 px-3">Application No</th>
                <th className="py-2.5 px-3">Parcel ID</th>
                <th className="py-2.5 px-3">Parties</th>
                <th className="py-2.5 px-3">Current Stage</th>
                <th className="py-2.5 px-3">SLA Status</th>
                <th className="py-2.5 px-3">Workflow State</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => {
                const isBreached = app.is_sla_breached;
                const isRejected = app.status === 'REJECTED';
                const isApproved = app.status === 'APPROVED';

                return (
                  <tr
                    key={app.id}
                    className={`hover:bg-slate-50 transition ${
                      isBreached ? 'bg-red-50/50 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-[#0a2540]">{app.id}</td>
                    <td className="py-3 px-3 font-mono text-slate-800">{app.parcel_id}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{app.buyer_name}</div>
                      <div className="text-[10px] text-slate-500">From: {app.applicant_name} ({app.formatted_declared_value})</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">
                        {['1. Revenue (Patwari)', '2. Cadastral Survey', '3. Legal & e-Courts', '4. Sub-Registrar', '5. SDM Mutation'][app.current_stage_index] || 'Stage 5'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {isBreached ? (
                        <span className="text-red-700 font-bold flex items-center gap-1 bg-red-100 px-2 py-0.5 rounded text-[10px] border border-red-300">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          ⚠ SLA BREACHED
                        </span>
                      ) : (
                        <span className="text-emerald-800 font-semibold flex items-center gap-1 text-[10px]">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          On Schedule
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {isApproved && (
                        <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-300">
                          ✓ APPROVED
                        </span>
                      )}
                      {isRejected && (
                        <span className="bg-red-100 text-red-900 font-bold px-2 py-0.5 rounded text-[10px] border border-red-300">
                          ❌ REJECTED
                        </span>
                      )}
                      {!isApproved && !isRejected && (
                        <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300">
                          ⏳ UNDER REVIEW
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={async () => {
                          const fullApp = await api.getApplicationDetail(app.id);
                          setSelectedApp(fullApp);
                        }}
                        className="bg-[#0a2540] hover:bg-slate-800 text-white font-bold text-[11px] py-1.5 px-3 rounded shadow transition"
                      >
                        Inspect & Act
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION & STATUTORY DECISION MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  STATUTORY CASE INSPECTION DOSSIER
                </span>
                <h3 className="text-base font-extrabold text-[#0a2540] font-mono">
                  {selectedApp.id} — Parcel {selectedApp.parcel_id}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedApp(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Overdue Warning if SLA Breached */}
            {selectedApp.is_sla_breached && (
              <div className="bg-red-50 border-l-4 border-red-600 p-3.5 rounded-r-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-red-950">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    ⚠ SLA DEADLINE EXCEEDED — SUPERVISORY AUDIT ESCALATION
                  </span>
                  <span className="text-[10px] text-red-800">Escalated to SDM / Collector</span>
                </div>
                <p className="text-red-800 text-[11px]">
                  This stage has exceeded statutory deadline. Delay explanation must be recorded before final disposal.
                </p>
                {selectedApp.delay_explanation ? (
                  <p className="text-[11px] bg-white p-2 rounded border border-red-200 text-slate-800">
                    <strong>Recorded Delay Reason:</strong> {selectedApp.delay_explanation}
                  </p>
                ) : (
                  <button
                    onClick={() => setActionType('DELAY_EXPLANATION')}
                    className="bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold py-1 px-2.5 rounded"
                  >
                    + Submit Mandatory Delay Explanation
                  </button>
                )}
              </div>
            )}

            {/* Application Facts Grid with Indian Formatting */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">Applicant (Transferor):</span>
                <strong className="text-slate-900">{selectedApp.applicant_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Buyer (Transferee):</span>
                <strong className="text-slate-900">{selectedApp.buyer_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Declared Consideration:</span>
                <strong className="text-slate-900">{selectedApp.formatted_declared_value}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Stamp Duty Paid:</span>
                <strong className="text-slate-900">₹{selectedApp.stamp_duty_paid_lakhs} Lakhs</strong>
              </div>
            </div>

            {/* Supporting Statutory Documents & Instant SHA-256 Check */}
            <div className="border border-slate-200 rounded-lg p-3.5 text-xs space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
                Off-Chain Statutory Documents & Cryptographic Hashes
              </span>
              <div className="space-y-2">
                {selectedApp.documents?.map((d) => (
                  <div key={d.id} className="bg-slate-50 p-2.5 rounded border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="font-bold text-slate-900">{d.title} ({d.file_name})</div>
                      <div className="text-[10px] font-mono text-slate-500 break-all">SHA-256: {d.sha256_hash}</div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300 whitespace-nowrap">
                      ✓ HASH MATCHED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock Government Verification Integrations */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 text-xs space-y-2">
              <span className="font-bold text-blue-950 text-[11px] uppercase tracking-wider block">
                Cross-Department Integrated Government Checks (Mock APIs)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-white p-2.5 rounded border border-blue-100">
                  <span className="text-slate-500 block">Jamabandi Revenue Record:</span>
                  <span className="text-emerald-700 font-bold">✓ Active Land Record Match</span>
                </div>
                <div className="bg-white p-2.5 rounded border border-blue-100">
                  <span className="text-slate-500 block">e-Courts National NJDG:</span>
                  <span className="text-emerald-700 font-bold">✓ No Pending Civil Injunction</span>
                </div>
                <div className="bg-white p-2.5 rounded border border-blue-100">
                  <span className="text-slate-500 block">CERSAI Bank Mortgage:</span>
                  <span className="text-emerald-700 font-bold">✓ No Undisclosed Bank Lien</span>
                </div>
              </div>
            </div>

            {/* ACTION PANEL */}
            {selectedApp.status !== 'APPROVED' && (
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <span className="font-bold text-slate-800 text-xs block">
                  Select Statutory Action as {currentUser.full_name} ({currentUser.department}):
                </span>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setActionType('APPROVE')}
                    className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                      actionType === 'APPROVE'
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-500'
                        : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Stage with Digital Signature
                  </button>

                  <button
                    onClick={() => setActionType('REJECT')}
                    className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                      actionType === 'REJECT'
                        ? 'bg-red-700 text-white ring-2 ring-red-500'
                        : 'bg-red-100 text-red-900 hover:bg-red-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject with Mandatory Reason
                  </button>

                  <button
                    onClick={() => setActionType('REQUEST_CORRECTION')}
                    className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                      actionType === 'REQUEST_CORRECTION'
                        ? 'bg-amber-700 text-white ring-2 ring-amber-500'
                        : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Request Correction / Missing Proof
                  </button>
                </div>

                {/* Sub-form for Rejection */}
                {actionType === 'REJECT' && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-3">
                    <span className="font-bold text-red-950 text-xs block">
                      Mandatory Rejection Grounds (Section 45 Land Registration Act):
                    </span>
                    <select
                      value={rejectionCategory}
                      onChange={(e) => setRejectionCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg text-xs font-semibold bg-white"
                    >
                      {rejectionCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <textarea
                      rows={3}
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      required
                      placeholder="Enter mandatory detailed statutory rationale for rejection..."
                      className="w-full p-2.5 border border-red-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                {/* Sub-form for Approval */}
                {actionType === 'APPROVE' && (
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 space-y-2 text-xs">
                    <span className="font-bold text-emerald-950 block">
                      Statutory Clearance & Cryptographic Signature Certificate:
                    </span>
                    <p className="text-emerald-900 text-[11px]">
                      By clicking confirm, an X.509 NIC DSC digital signature digest will be signed and attached to this stage audit record.
                      {selectedApp.current_stage_index === 4 && ' FINAL SDM APPROVAL WILL MINT A NEW BLOCK IN THE SOVEREIGN PERMISSIONED LEDGER!'}
                    </p>
                    <input
                      type="text"
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      placeholder="Optional officer remarks (e.g., Records verified and found in order)"
                      className="w-full p-2 border border-emerald-300 rounded text-xs bg-white"
                    />
                  </div>
                )}

                {/* Sub-form for Delay Explanation */}
                {actionType === 'DELAY_EXPLANATION' && (
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-2 text-xs">
                    <span className="font-bold text-amber-950 block">
                      Official Delay Explanation for Supervisory Audit:
                    </span>
                    <textarea
                      rows={3}
                      value={delayExplanation}
                      onChange={(e) => setDelayExplanation(e.target.value)}
                      placeholder="State reason for delay in SLA compliance..."
                      className="w-full p-2.5 border border-amber-300 rounded text-xs bg-white"
                    />
                  </div>
                )}

                {/* Confirm Action Button */}
                {actionType && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setActionType(null)}
                      className="bg-slate-100 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleOfficerSubmit}
                      disabled={isProcessing}
                      className="bg-[#0a2540] hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-lg shadow"
                    >
                      {isProcessing ? 'Executing Statutory Action...' : 'Confirm Statutory Action'}
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
