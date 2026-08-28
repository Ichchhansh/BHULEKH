'use client';

import React, { useState } from 'react';
import { 
  User, Parcel, ApplicationRecord, api 
} from '@/lib/api';
import { 
  FileText, Plus, ShieldCheck, MapPin, Clock, AlertTriangle, 
  CheckCircle, ArrowRight, Upload, Scale, Building2, HelpCircle, Eye, Printer, ChevronRight, XCircle, Landmark
} from 'lucide-react';

interface CitizenPortalProps {
  currentUser: User;
  parcels: Parcel[];
  applications: ApplicationRecord[];
  onSelectParcelForMap: (parcel: Parcel) => void;
  onRefreshData: () => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  currentUser,
  parcels,
  applications,
  onSelectParcelForMap,
  onRefreshData
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'holdings' | 'applications'>('holdings');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [viewingRorParcel, setViewingRorParcel] = useState<Parcel | null>(null);
  
  const [correctionApp, setCorrectionApp] = useState<ApplicationRecord | null>(null);
  const [correctionRemarks, setCorrectionRemarks] = useState('');
  const [appealApp, setAppealApp] = useState<ApplicationRecord | null>(null);
  const [appealRemarks, setAppealRemarks] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Application Wizard Form State
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerAadhaar, setBuyerAadhaar] = useState('XXXX-XXXX-9912');
  const [buyerPhone, setBuyerPhone] = useState('+91 98XXX-XX202');
  const [transferType, setTransferType] = useState('SALE_DEED_MUTATION');
  const [declaredValueLakhs, setDeclaredValueLakhs] = useState<number>(125.0);
  const [saleDeedFileName, setSaleDeedFileName] = useState('Registered_Sale_Deed_Executed.pdf');
  const [saleDeedHash, setSaleDeedHash] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

  const myParcels = parcels.filter(p => p.current_owner_id === currentUser.id || p.current_owner_name === currentUser.full_name);
  const myApplications = applications.filter(a => a.applicant_id === currentUser.id || a.applicant_name === currentUser.full_name);

  const handleFileSimulate = (name: string) => {
    setSaleDeedFileName(name);
    let h = 0x811c9dc5;
    for (let i = 0; i < name.length; i++) {
      h ^= name.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    const sampleHex = Math.abs(h).toString(16).padStart(8, '0') + 'f91c94b29a88310c9e782a510d9319e75618b0c';
    setSaleDeedHash(sampleHex.slice(0, 64));
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcelId || !buyerName) return;

    setIsSubmittingAction(true);
    try {
      const stampDuty = Math.round(declaredValueLakhs * 0.07 * 100) / 100;
      await api.submitApplication({
        parcel_id: selectedParcelId,
        buyer_name: buyerName,
        buyer_masked_aadhaar: buyerAadhaar,
        buyer_phone_masked: buyerPhone,
        transfer_type: transferType,
        declared_value_lakhs: declaredValueLakhs,
        stamp_duty_paid_lakhs: stampDuty,
        documents: [
          {
            doc_type: 'SALE_DEED',
            title: 'Registered Conveyance / Mutation Deed',
            file_name: saleDeedFileName,
            sha256_hash: saleDeedHash,
            file_size_kb: 512.0
          },
          {
            doc_type: 'KHASRA_KHATAUNI_ROR',
            title: 'Verified Record of Rights Extract',
            file_name: 'Khatauni_Certified_Extract.pdf',
            sha256_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
            file_size_kb: 340.0
          }
        ]
      }, currentUser.id);

      setIsApplyModalOpen(false);
      setWizardStep(1);
      setActiveSubTab('applications');
      onRefreshData();
    } catch (err: any) {
      alert(`Error submitting application: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSubmitCorrection = async () => {
    if (!correctionApp || !correctionRemarks.trim()) return;
    setIsSubmittingAction(true);
    try {
      await api.citizenCorrection(correctionApp.id, {
        remarks: correctionRemarks,
        new_documents: [{
          doc_type: 'CORRECTION_AFFIDAVIT',
          title: 'Demarcation Survey Settlement Affidavit',
          file_name: 'Rectified_Boundary_Settlement.pdf',
          sha256_hash: '4d8a1c9e83b271f00a94b8e210c44298fc1c149afbf4c8996fb92427ae41e464'
        }]
      }, currentUser.full_name);
      setCorrectionApp(null);
      setCorrectionRemarks('');
      onRefreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealApp || !appealRemarks.trim()) return;
    setIsSubmittingAction(true);
    try {
      await api.citizenAppeal(appealApp.id, appealRemarks, currentUser.full_name);
      setAppealApp(null);
      setAppealRemarks('');
      onRefreshData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Citizen Welcome Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded font-bold border border-emerald-300">
              Verified Citizen Landowner
            </span>
            <span className="text-slate-500 text-xs font-mono">Aadhaar: {currentUser.aadhaar_masked}</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#0a2540] mt-1">
            {currentUser.full_name}&apos;s Digital Land Holdings
          </h2>
          <p className="text-xs text-slate-600">
            You own <strong>{myParcels.length} verified land parcel(s)</strong> across India. You can sell, transfer, download digital RoR (Khatauni) extracts, or apply for mutation below.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (myParcels.length > 0) {
                setSelectedParcelId(myParcels[0].id);
                setDeclaredValueLakhs(myParcels[0].estimated_govt_value_lakhs);
              }
              setIsApplyModalOpen(true);
            }}
            className="bg-[#0a2540] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow transition"
          >
            <Plus className="w-4 h-4" />
            Sell / Apply for Land Mutation
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('holdings')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'holdings'
              ? 'border-[#0a2540] text-[#0a2540]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          My Land Holdings ({myParcels.length})
        </button>

        <button
          onClick={() => setActiveSubTab('applications')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'applications'
              ? 'border-[#0a2540] text-[#0a2540]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Tracked Mutation Applications ({myApplications.length})
        </button>
      </div>

      {/* SUBTAB 1: MY HOLDINGS */}
      {activeSubTab === 'holdings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myParcels.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition">
              
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      PARCEL ID (ULIN)
                    </span>
                    <span className="text-sm font-extrabold text-[#0a2540] font-mono">{p.id}</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">
                    ✓ TITLE CLEAR
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <strong className="text-slate-800">{p.village}, {p.district}, {p.state}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Authority:</span>
                    <strong className="text-blue-900 text-[11px]">{p.revenue_authority}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Khasra / Plot:</span>
                    <strong className="font-mono text-slate-800">{p.khasra_no} / {p.khata_no}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Cadastral Area:</span>
                    <strong className="text-[#0a2540] font-bold">{p.area_sqft.toLocaleString()} sq ft ({p.area_local_unit})</strong>
                  </p>
                </div>

                <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Govt Circle Rate:</span>
                    <span className="font-bold text-slate-900">₹{p.circle_rate_sqft_2026.toLocaleString()}/sq ft</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-bold text-[#0a2540]">Circle Rate Value:</span>
                    <span className="text-sm font-extrabold text-[#0a2540]">{p.formatted_value_str}</span>
                  </div>
                </div>

                {p.is_for_sale ? (
                  <div className="bg-purple-100 text-purple-900 text-[11px] font-bold px-2.5 py-1 rounded border border-purple-300 flex items-center justify-between">
                    <span>🏷 Listed for Sale by You</span>
                    <span>₹{p.listing_price_lakhs} Lakhs</span>
                  </div>
                ) : (
                  <div className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded text-center">
                    Not currently listed for sale (Available to list/sell anytime)
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                <button
                  onClick={() => setViewingRorParcel(p)}
                  className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold py-1.5 px-2 rounded flex items-center justify-center gap-1 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  View RoR Extract
                </button>
                <button
                  onClick={() => onSelectParcelForMap(p)}
                  className="flex-1 bg-[#0a2540] hover:bg-slate-800 text-white text-[11px] font-bold py-1.5 px-2 rounded flex items-center justify-center gap-1 transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  View on GIS Map
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 2: TRACKED APPLICATIONS */}
      {activeSubTab === 'applications' && (
        <div className="space-y-4">
          {myApplications.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
              <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold">No Active Applications</p>
              <p className="text-xs text-slate-400 mt-1">Submit a new mutation application to track its progress.</p>
            </div>
          ) : (
            myApplications.map((app) => {
              const isBreached = app.is_sla_breached;
              const isRejected = app.status === 'REJECTED';
              const isApproved = app.status === 'APPROVED';

              return (
                <div key={app.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-[#0a2540]">{app.id}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs font-semibold text-slate-700 font-mono">Parcel: {app.parcel_id}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Transfer to <strong>{app.buyer_name}</strong> (Declared Value: {app.formatted_declared_value})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isBreached && (
                        <span className="official-stamp-breached text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          ⚠ SLA BREACHED (OVERDUE)
                        </span>
                      )}

                      {isRejected && (
                        <span className="official-stamp-rejected text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          APPLICATION REJECTED
                        </span>
                      )}

                      {isApproved && (
                        <span className="official-stamp text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                          MUTATION COMMITTED ON LEDGER
                        </span>
                      )}

                      {!isBreached && !isRejected && !isApproved && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          UNDER REVIEW (STAGE {app.current_stage_index + 1}/5)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rejection Alert Box */}
                  {isRejected && (
                    <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg space-y-2">
                      <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>Statutory Rejection Ground: {app.rejection_category}</span>
                      </div>
                      <p className="text-xs text-red-800 leading-relaxed">
                        &ldquo;{app.rejection_remarks}&rdquo;
                      </p>
                      <div className="text-[11px] text-red-700 flex justify-between pt-1 border-t border-red-200">
                        <span>Issued by: {app.rejection_officer_name} ({app.rejection_department})</span>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setCorrectionApp(app);
                            setCorrectionRemarks(`Submitted rectification addressing ${app.rejection_category}`);
                          }}
                          className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-1.5 px-3 rounded shadow transition"
                        >
                          Submit Corrected Documents / Rectification
                        </button>
                        <button
                          onClick={() => {
                            setAppealApp(app);
                            setAppealRemarks('I hereby file formal statutory appeal under the Land Revenue Act requesting supervisory review by District Magistrate / SDM Court.');
                          }}
                          className="bg-white hover:bg-slate-50 border border-red-400 text-red-900 text-xs font-bold py-1.5 px-3 rounded transition"
                        >
                          File Formal Appeal to District Collector
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Visual 5-Stage Step Flow */}
                  <div className="py-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Statutory Verification Stages & SLAs
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {[
                        { title: '1. Revenue (Patwari)', dept: 'Revenue Dept' },
                        { title: '2. Cadastral Survey', dept: 'Land Survey GIS' },
                        { title: '3. Legal & e-Courts', dept: 'Legal Affairs' },
                        { title: '4. Sub-Registrar', dept: 'Stamps & SRO' },
                        { title: '5. SDM Mutation', dept: 'District Admin' },
                      ].map((stg, sIndex) => {
                        const isPast = sIndex < app.current_stage_index || isApproved;
                        const isCurrent = sIndex === app.current_stage_index && !isApproved && !isRejected;
                        const isCurrentRejected = sIndex === app.current_stage_index && isRejected;

                        let badgeColor = 'bg-slate-100 text-slate-500 border-slate-200';
                        if (isPast) badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                        if (isCurrent) badgeColor = isBreached ? 'bg-red-50 text-red-900 border-red-400 animate-pulse-breach' : 'bg-blue-50 text-blue-900 border-blue-300 font-bold';
                        if (isCurrentRejected) badgeColor = 'bg-red-100 text-red-900 border-red-500';

                        return (
                          <div key={sIndex} className={`p-2.5 rounded-lg border text-center text-xs space-y-1 ${badgeColor}`}>
                            <div className="font-bold flex items-center justify-center gap-1">
                              {isPast && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                              {isCurrent && <Clock className="w-3.5 h-3.5 text-blue-600" />}
                              {isCurrentRejected && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                              <span>{stg.title}</span>
                            </div>
                            <p className="text-[10px] opacity-80">{stg.dept}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isApproved && app.final_ledger_tx_hash && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-emerald-950">
                        <span>Permissioned Sovereign Ledger Transaction Receipt</span>
                        <span className="font-mono text-[10px] bg-emerald-200 px-2 py-0.5 rounded">Block #{app.final_ledger_block_index}</span>
                      </div>
                      <p className="text-[11px] font-mono text-emerald-900 break-all">
                        Tx Hash: {app.final_ledger_tx_hash}
                      </p>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: NEW APPLICATION WIZARD */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0a2540]">
                  New Land Transfer & Mutation Application
                </h3>
                <p className="text-xs text-slate-500">
                  Step {wizardStep} of 2 — Statutory Ownership Transfer Filing
                </p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-4">
              
              {wizardStep === 1 && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Land Parcel to Transfer:
                    </label>
                    <select
                      value={selectedParcelId}
                      onChange={(e) => {
                        setSelectedParcelId(e.target.value);
                        const matched = myParcels.find(p => p.id === e.target.value);
                        if (matched) {
                          setDeclaredValueLakhs(matched.estimated_govt_value_lakhs);
                        }
                      }}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 focus:ring-2 focus:ring-[#0a2540] focus:outline-none"
                    >
                      <option value="">-- Choose from your owned parcels --</option>
                      {myParcels.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.id} — Khasra {p.khasra_no} ({p.village}, {p.district}) - {p.area_sqft.toLocaleString()} sq ft
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Buyer Full Legal Name (Transferee):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Siddharth Malhotra"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#0a2540] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Buyer Masked Aadhaar:
                      </label>
                      <input
                        type="text"
                        value={buyerAadhaar}
                        onChange={(e) => setBuyerAadhaar(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Transfer Nature:
                      </label>
                      <select
                        value={transferType}
                        onChange={(e) => setTransferType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                      >
                        <option value="SALE_DEED_MUTATION">Sale Deed Conveyance</option>
                        <option value="INHERITANCE_MUTATION">Inheritance / Virasat</option>
                        <option value="GIFT_DEED_MUTATION">Gift Deed Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Declared Consideration (₹ Lakhs):
                      </label>
                      <input
                        type="number"
                        value={declaredValueLakhs}
                        onChange={(e) => setDeclaredValueLakhs(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-[#0a2540]"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        {declaredValueLakhs >= 100 ? `₹${(declaredValueLakhs/100).toFixed(2)} Crores` : `₹${declaredValueLakhs} Lakhs`}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Est. Stamp Duty (7%):</span>
                      <span className="text-xs font-bold text-slate-800">₹{(declaredValueLakhs * 0.07).toFixed(2)} Lakhs</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedParcelId || !buyerName) {
                        alert('Please select a parcel and provide buyer name.');
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className="w-full bg-[#0a2540] hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    Continue to Document Hashing <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs space-y-1">
                    <span className="font-bold text-[#0a2540] flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-blue-700" />
                      Cryptographic Document Fingerprinting
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Deed scans remain securely off-chain in state revenue vaults. SHA-256 fingerprints are published to the ledger for mathematical non-repudiation.
                    </p>
                  </div>

                  <div className="border border-dashed border-slate-300 p-4 rounded-lg text-center space-y-2 bg-slate-50">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Simulate Registered Sale Deed Upload</p>
                    <div className="flex gap-2 justify-center">
                      {['Sale_Deed_Signed_2026.pdf', 'Court_Clearance_NOC.pdf', 'Khatauni_ROR_Extract.pdf'].map(fn => (
                        <button
                          key={fn}
                          type="button"
                          onClick={() => handleFileSimulate(fn)}
                          className="bg-white border border-slate-300 px-2.5 py-1 rounded text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {fn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-100 p-3 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Selected File:</span>
                      <span className="font-bold text-slate-800">{saleDeedFileName}</span>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-slate-500 block">Computed SHA-256 Hash:</span>
                      <span className="font-mono text-slate-800 break-all bg-white p-1.5 rounded border border-slate-200 block mt-0.5">
                        {saleDeedHash}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAction}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-lg shadow"
                    >
                      {isSubmittingAction ? 'Submitting...' : 'Submit Mutation Application'}
                    </button>
                  </div>
                </div>
              )}

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: DIGITAL ROR / KHATAUNI EXTRACT (DYNAMIC STATE AUTHORITY) */}
      {viewingRorParcel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Dynamic State ROR Header */}
            <div className="text-center border-b-2 border-slate-800 pb-3 relative space-y-1">
              <span className="text-xs font-extrabold tracking-wider text-slate-700 uppercase block">
                {viewingRorParcel.revenue_authority}
              </span>
              <h3 className="text-base font-black text-[#0a2540] uppercase tracking-wide">
                अधिकार अभिलेख (खतौनी / RTC / RoR) / Record of Rights Extract
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Statutorily Generated under the Land Revenue Code of {viewingRorParcel.state}
              </p>
            </div>

            {/* ROR Table */}
            <div className="border border-slate-300 text-xs">
              <div className="grid grid-cols-4 bg-slate-100 p-2 font-bold border-b border-slate-300 text-[11px]">
                <div>State: {viewingRorParcel.state}</div>
                <div>District: {viewingRorParcel.district}</div>
                <div>Tehsil: {viewingRorParcel.tehsil}</div>
                <div>Village: {viewingRorParcel.village}</div>
              </div>

              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Unique Parcel ID (ULIN):</span>
                    <strong className="font-mono">{viewingRorParcel.id}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Khasra / Plot / Survey No:</span>
                    <strong className="font-mono">{viewingRorParcel.khasra_no} / {viewingRorParcel.khata_no}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Recorded Landowner:</span>
                    <strong>{viewingRorParcel.current_owner_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Cadastral Survey Area:</span>
                    <strong>{viewingRorParcel.area_sqft.toLocaleString()} sq ft ({viewingRorParcel.area_local_unit})</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Stamp & Certificate Watermark */}
            <div className="bg-slate-50 p-3 rounded border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-emerald-700 font-bold block">✓ Digitally Certified by NIC e-Sign & State Authority</span>
                <span className="text-[10px] text-slate-500 font-mono">Ledger Node Fingerprint: NIC-DLRP-2026</span>
              </div>
              <div className="official-stamp text-[10px]">
                CERTIFIED ROR
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setViewingRorParcel(null)}
                className="bg-slate-800 text-white text-xs font-bold py-1.5 px-4 rounded"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: CORRECTION FORM */}
      {correctionApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-extrabold text-[#0a2540]">
              Submit Rectification / Corrected Documents
            </h3>
            <p className="text-xs text-slate-500">
              Provide justification and revised documents addressing the officer&apos;s rejection reason.
            </p>
            <textarea
              rows={3}
              value={correctionRemarks}
              onChange={(e) => setCorrectionRemarks(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0a2540]"
              placeholder="Explain how the issue was resolved..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCorrectionApp(null)}
                className="bg-slate-100 text-slate-700 text-xs font-bold py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCorrection}
                disabled={isSubmittingAction}
                className="bg-[#0a2540] text-white text-xs font-bold py-2 px-4 rounded-lg"
              >
                {isSubmittingAction ? 'Submitting...' : 'Submit Rectification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: APPEAL FORM */}
      {appealApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-extrabold text-[#0a2540]">
              File Statutory Appeal to District Collector / SDM
            </h3>
            <p className="text-xs text-slate-500">
              Appeal against the rejection order under the Land Revenue Code.
            </p>
            <textarea
              rows={3}
              value={appealRemarks}
              onChange={(e) => setAppealRemarks(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0a2540]"
              placeholder="State grounds of appeal..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAppealApp(null)}
                className="bg-slate-100 text-slate-700 text-xs font-bold py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAppeal}
                disabled={isSubmittingAction}
                className="bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg"
              >
                {isSubmittingAction ? 'Submitting...' : 'Submit Formal Appeal'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
