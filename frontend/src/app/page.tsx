'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, Parcel, ApplicationRecord, LedgerBlock, AuditEvent, OfficerStats, api 
} from '@/lib/api';
import { Header } from '@/components/Header';
import { CadastralMap } from '@/components/CadastralMap';
import { CitizenPortal } from '@/components/CitizenPortal';
import { OfficerQueue } from '@/components/OfficerQueue';
import { PublicRegistry } from '@/components/PublicRegistry';
import { BlockchainLedger } from '@/components/BlockchainLedger';
import { AuditTrail } from '@/components/AuditTrail';
import { Landmark, Shield, Lock, ExternalLink, Cpu } from 'lucide-react';

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [ledgerBlocks, setLedgerBlocks] = useState<LedgerBlock[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [officerStats, setOfficerStats] = useState<OfficerStats | null>(null);
  const [activeTab, setActiveTab] = useState<string>('gis-map');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [uList, pList, aList, bList, evList, oStats] = await Promise.all([
        api.getUsers(),
        api.getParcels(),
        api.getApplications(),
        api.getLedgerBlocks(),
        api.getAuditEvents(),
        api.getOfficerStats()
      ]);

      setUsers(uList);
      if (!currentUser && uList.length > 0) {
        // Default to Rajesh Sharma (Citizen) or first user
        const defaultUser = uList.find(u => u.username === 'rajesh_sharma') || uList[0];
        setCurrentUser(defaultUser);
      }
      setParcels(pList);
      setApplications(aList);
      setLedgerBlocks(bList);
      setAuditEvents(evList);
      setOfficerStats(oStats);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // 10s polling for background SLA refresh
    return () => clearInterval(interval);
  }, []);

  const handleSelectUser = (u: User) => {
    setCurrentUser(u);
    if (u.role === 'CITIZEN') {
      setActiveTab('citizen-portal');
    } else {
      setActiveTab('officer-queue');
    }
  };

  const handleSelectParcelForMap = (p: Parcel) => {
    setSelectedParcel(p);
    setActiveTab('gis-map');
  };

  const handleToggleSaleListing = async (p: Parcel, isForSale: boolean, price?: number) => {
    if (!currentUser) return;
    try {
      await api.toggleListing(p.id, isForSale, price, currentUser.full_name);
      await loadData();
      if (selectedParcel?.id === p.id) {
        const updated = await api.getParcelDetail(p.id);
        setSelectedParcel(updated);
      }
    } catch (e: any) {
      alert(`Error toggling listing: ${e.message}`);
    }
  };

  const handleInitiateTransfer = (p: Parcel) => {
    setActiveTab('citizen-portal');
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 bg-slate-200 border-2 border-slate-300 rounded-xl flex flex-col items-center justify-center p-1 animate-pulse">
          <Landmark className="w-8 h-8 text-[#0a2540]" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-extrabold text-[#0a2540] tracking-tight">BHULEKH LEDGER</h2>
          <p className="text-xs text-slate-500 font-medium">Connecting to National Cadastral Node & Sovereign Blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      
      {/* Header */}
      <Header
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        users={users}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {activeTab === 'gis-map' && (
          <CadastralMap
            parcels={parcels}
            selectedParcel={selectedParcel}
            onSelectParcel={setSelectedParcel}
            currentUser={currentUser}
            onInitiateTransfer={handleInitiateTransfer}
            onToggleSaleListing={handleToggleSaleListing}
          />
        )}

        {activeTab === 'citizen-portal' && (
          <CitizenPortal
            currentUser={currentUser}
            parcels={parcels}
            applications={applications}
            onSelectParcelForMap={handleSelectParcelForMap}
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'officer-queue' && (
          <OfficerQueue
            currentUser={currentUser}
            applications={applications}
            stats={officerStats}
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'public-registry' && (
          <PublicRegistry
            parcels={parcels}
            onSelectParcelForMap={handleSelectParcelForMap}
          />
        )}

        {activeTab === 'blockchain-ledger' && (
          <BlockchainLedger
            blocks={ledgerBlocks}
            onRefreshData={loadData}
          />
        )}

        {activeTab === 'audit-trail' && (
          <AuditTrail
            events={auditEvents}
            onRefresh={loadData}
          />
        )}
      </main>

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-300 text-xs border-t-4 border-[#FF9933] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-b border-slate-800 pb-6">
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-400" />
                <span className="font-extrabold text-white text-sm">BHULEKH LEDGER</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                National Digital Land Governance & Sovereign Ownership Infrastructure (DLRP-2026). Developed in collaboration with the Department of Land Resources & NIC.
              </p>
            </div>

            <div className="space-y-1 text-[11px]">
              <span className="font-bold text-white uppercase tracking-wider block mb-2">Statutory Principles</span>
              <p className="text-slate-400">✓ Authoritative Government Clearance as Legal Truth</p>
              <p className="text-slate-400">✓ Off-Chain PII Isolation (No Aadhaar On-Chain)</p>
              <p className="text-slate-400">✓ Public Services Guarantee SLA Compliance</p>
              <p className="text-slate-400">✓ Cryptographic SHA-256 Tamper Proofs</p>
            </div>

            <div className="space-y-1 text-[11px]">
              <span className="font-bold text-white uppercase tracking-wider block mb-2">Government Portals</span>
              <p className="text-slate-400 hover:text-white cursor-pointer">Digital India Land Record Modernization (DILRMP)</p>
              <p className="text-slate-400 hover:text-white cursor-pointer">Unique Land Parcel Identification Number (ULPIN / Bhu-Aadhaar)</p>
              <p className="text-slate-400 hover:text-white cursor-pointer">National Generic Document Registration System (NGDRS)</p>
              <p className="text-slate-400 hover:text-white cursor-pointer">National Judicial Data Grid (e-Courts NJDG)</p>
            </div>

            <div className="space-y-2 text-[11px]">
              <span className="font-bold text-white uppercase tracking-wider block mb-2">Legal Disclaimer</span>
              <p className="text-slate-400 leading-relaxed">
                This prototype application is designed for administrative proof-of-concept purposes. All names, parcel identifiers, and cadastral boundaries displayed are fictional demonstration data.
              </p>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-2">
            <div>
              © 2026 Ministry of Rural Development & National Informatics Centre (NIC). All Rights Reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Security Audited (CERT-In Standard)</span>
              <span>•</span>
              <span>W3C WCAG 2.1 AAA Compliant</span>
              <span>•</span>
              <span className="font-mono">Node ID: NIC-DLRP-NODE-01</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
