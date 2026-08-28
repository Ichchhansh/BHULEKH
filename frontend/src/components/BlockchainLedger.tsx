'use client';

import React, { useState, useEffect } from 'react';
import { LedgerBlock, api } from '@/lib/api';
import { 
  Cpu, ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw, 
  AlertTriangle, ArrowDown, Lock, Key, Link as LinkIcon, FileCheck, Check,
  Landmark, Award, Sparkles, Copy, ChevronRight, UserCheck, Scale, FileText
} from 'lucide-react';

interface BlockchainLedgerProps {
  blocks: LedgerBlock[];
  onRefreshData: () => void;
}

export const BlockchainLedger: React.FC<BlockchainLedgerProps> = ({
  blocks,
  onRefreshData
}) => {
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [tamperBlockIndex, setTamperBlockIndex] = useState<number>(1);
  const [isTampering, setIsTampering] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    handleVerifyChain();
  }, [blocks]);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyLedgerChain();
      setVerificationResult(res);
    } catch (e: any) {
      alert(`Verification error: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    setIsTampering(true);
    try {
      const res = await api.simulateTamper(tamperBlockIndex, 'status', 'UNAUTHORIZED_FRAUDULENT_RECORD_ALTERATION');
      setVerificationResult(res.verification_result);
      onRefreshData();
    } catch (e: any) {
      alert(`Tamper error: ${e.message}`);
    } finally {
      setIsTampering(false);
    }
  };

  const handleResetTamper = async () => {
    setIsResetting(true);
    try {
      await api.resetTamper();
      await handleVerifyChain();
      onRefreshData();
    } catch (e: any) {
      alert(`Reset error: ${e.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Overview */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#0a2540] text-white text-[11px] px-2.5 py-0.5 rounded font-extrabold flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> SOVEREIGN PERMISSIONED LEDGER
              </span>
              <span className="text-slate-500 text-xs font-semibold">Consensus: Multi-Sign Proof-of-Statute</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0a2540] mt-1">
              Cryptographic Ownership Provenance & Tamper Audit
            </h2>
            <p className="text-xs text-slate-600">
              Tamper-evident parent hash chaining, Merkle root tree validation, and digital certificate verification without storing off-chain personal data.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              Run Cryptographic Audit
            </button>

            <button
              onClick={handleResetTamper}
              disabled={isResetting}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-2.5 rounded-lg transition"
            >
              {isResetting ? 'Restoring...' : 'Restore Pristine State'}
            </button>
          </div>
        </div>

        {/* Audit Status Result Banner */}
        {verificationResult && (
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 text-xs transition ${
            verificationResult.is_valid
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-red-50 border-red-400 text-red-950 animate-pulse-breach'
          }`}>
            {verificationResult.is_valid ? (
              <ShieldCheck className="w-7 h-7 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-red-600 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 space-y-1">
              <div className="font-extrabold text-sm flex items-center gap-2">
                {verificationResult.is_valid ? (
                  <span>✓ LEDGER INTEGRITY 100% VERIFIED — ALL {verificationResult.total_blocks} BLOCKS MATHEMATICALLY VALID</span>
                ) : (
                  <span>❌ FRAUDULENT RECORD TAMPER DETECTED AT BLOCK #{verificationResult.corrupted_at_index}!</span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-700">
                {verificationResult.is_valid
                  ? `Every block header SHA-256 hash, Merkle tree root, and parent hash linkage perfectly match mathematical proofs. No unauthorized record alteration has occurred.`
                  : `Cryptographic Mismatch: ${verificationResult.details}. The mathematical block hash no longer matches the underlying database payload!`}
              </p>
            </div>
          </div>
        )}

        {/* Interactive Tamper Simulator Panel (User-Friendly Design) */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#0a2540]">
            <Lock className="w-4 h-4 text-red-600" />
            <span>Interactive Security Demo: Test Database Tamper Resistance</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            In traditional centralized databases, an insider could modify a land record undetected. In Bhulekh Ledger, any direct alteration of database rows immediately invalidates the cryptographic block hash. Test it live:
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-300">
              <span>Target:</span>
              <select
                value={tamperBlockIndex}
                onChange={(e) => setTamperBlockIndex(parseInt(e.target.value))}
                className="font-bold text-[#0a2540] bg-transparent focus:outline-none"
              >
                {blocks.map(b => (
                  <option key={b.block_index} value={b.block_index}>
                    Block #{b.block_index} ({b.event_type.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSimulateTamper}
              disabled={isTampering}
              className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-2 px-4 rounded-lg shadow transition flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {isTampering ? 'Injecting Tamper...' : 'Simulate Database Tamper on Selected Block'}
            </button>
          </div>
        </div>

      </div>

      {/* User-Friendly Visual Block Sequence */}
      <div className="space-y-4">
        {blocks.map((b, idx) => {
          let payload: any = {};
          try {
            payload = JSON.parse(b.payload_json);
          } catch (e) {
            payload = {};
          }

          let signatures: any[] = [];
          try {
            signatures = JSON.parse(b.officer_signatures);
          } catch (e) {
            signatures = [];
          }

          const isGenesis = b.block_index === 0;

          return (
            <div key={b.block_index} className="space-y-4">
              
              {/* Main Block Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Block Header Banner */}
                <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-[#0a2540] text-white font-extrabold flex items-center justify-center font-mono text-sm shadow">
                      #{b.block_index}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[#0a2540]">
                          {b.event_type.replace(/_/g, ' ')}
                        </h3>
                        {isGenesis && (
                          <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-300">
                            GENESIS NODE BOOTSTRAP
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Recorded on: <strong>{new Date(b.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-white text-slate-800 font-mono text-xs px-2.5 py-1 rounded font-bold border border-slate-300 shadow-sm">
                      Parcel: {b.parcel_id}
                    </span>
                  </div>
                </div>

                {/* Block Body Content (Structured Cards Instead of JSON) */}
                <div className="p-5 space-y-4">
                  
                  {/* Transaction Details Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                      Statutory Transaction Record (PII Preserved Off-Chain)
                    </span>

                    {isGenesis ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 text-[11px] block">Network Authority:</span>
                          <strong className="text-slate-900">{payload.root_authority || 'NIC Government of India'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px] block">Consensus Algorithm:</span>
                          <strong className="text-slate-900">{payload.consensus || 'Statutory Multi-Sign Proof-of-Statute'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px] block">Jurisdiction:</span>
                          <strong className="text-slate-900">{payload.jurisdiction || 'Republic of India'}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 text-[11px] block">State & District:</span>
                          <strong className="text-slate-900">{payload.state || 'Uttar Pradesh'} ({payload.district || 'Ghaziabad'})</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px] block">Khasra / Plot:</span>
                          <strong className="font-mono text-slate-900">{payload.khasra_no || '142/1'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px] block">Surveyed Area:</span>
                          <strong className="text-slate-900">{payload.area_sqft ? `${payload.area_sqft.toLocaleString()} sq ft` : '4,850 sq ft'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px] block">Transaction Value:</span>
                          <strong className="text-emerald-800 font-extrabold">
                            {payload.formatted_value || (payload.declared_value_lakhs ? `₹${payload.declared_value_lakhs} Lakhs` : 'Statutory Title')}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Statutory Digital Certificates Attached */}
                  {signatures.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Statutory Approval Certificates & Digital Signatures ({signatures.length}):
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {signatures.map((sig, sIdx) => (
                          <div key={sIdx} className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-lg text-xs space-y-1">
                            <div className="flex justify-between font-bold text-emerald-950">
                              <span className="flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-emerald-700" />
                                {sig.role.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                {sig.pubkey_fingerprint}
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-900">
                              <strong>Action:</strong> {sig.action}
                            </p>
                            <p className="text-[10px] font-mono text-emerald-800">
                              Signature Digest: {sig.signature_digest?.slice(0, 32)}...
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cryptographic Linkage Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center text-slate-500 font-bold text-[10px] uppercase">
                        <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3 text-[#0a2540]" /> Previous Block Hash</span>
                        <button onClick={() => handleCopy(b.previous_hash)} className="text-blue-700 hover:text-blue-900 flex items-center gap-1">
                          {copiedHash === b.previous_hash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <span className="font-mono text-[11px] text-slate-800 break-all block font-semibold">
                        {b.previous_hash}
                      </span>
                    </div>

                    <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center text-slate-500 font-bold text-[10px] uppercase">
                        <span className="flex items-center gap-1"><FileCheck className="w-3 h-3 text-blue-700" /> Merkle Tree Root Hash</span>
                        <button onClick={() => handleCopy(b.merkle_root)} className="text-blue-700 hover:text-blue-900 flex items-center gap-1">
                          {copiedHash === b.merkle_root ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <span className="font-mono text-[11px] text-blue-900 break-all block font-bold">
                        {b.merkle_root}
                      </span>
                    </div>
                  </div>

                  {/* Final Block Header Hash */}
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-blue-950 uppercase block">
                        Computed SHA-256 Block Hash:
                      </span>
                      <span className="font-mono text-xs font-extrabold text-[#0a2540] break-all">
                        {b.block_hash}
                      </span>
                    </div>
                    <span className="official-stamp text-[10px] whitespace-nowrap bg-white shadow-sm">
                      ✓ IMMUTABLE PROOF
                    </span>
                  </div>

                </div>

              </div>

              {/* Connecting Chain Link Icon */}
              {idx < blocks.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 shadow-sm">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
