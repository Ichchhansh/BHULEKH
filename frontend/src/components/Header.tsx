'use client';

import React, { useState } from 'react';
import { Shield, Building2, User, Landmark, CheckCircle, Award, RefreshCw, FileText, Map, Layers, Lock, Cpu } from 'lucide-react';
import { User as UserType } from '@/lib/api';

interface HeaderProps {
  currentUser: UserType;
  onSelectUser: (user: UserType) => void;
  users: UserType[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSelectUser,
  users,
  activeTab,
  setActiveTab
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CITIZEN':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-semibold border border-emerald-300">Citizen / Landowner</span>;
      case 'REVENUE_OFFICER':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded font-semibold border border-amber-300">Revenue (Tehsildar)</span>;
      case 'SURVEY_OFFICER':
        return <span className="bg-cyan-100 text-cyan-800 text-xs px-2.5 py-0.5 rounded font-semibold border border-cyan-300">Cadastral Surveyor</span>;
      case 'LEGAL_OFFICER':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded font-semibold border border-purple-300">Legal & e-Courts Officer</span>;
      case 'REGISTRATION_OFFICER':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded font-semibold border border-blue-300">Sub-Registrar (SRO)</span>;
      case 'SDM_APPROVER':
        return <span className="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-0.5 rounded font-bold border border-indigo-300">SDM / District Approver</span>;
      case 'ADMIN':
        return <span className="bg-slate-200 text-slate-800 text-xs px-2.5 py-0.5 rounded font-semibold border border-slate-400">NIC System Admin</span>;
      default:
        return null;
    }
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Top Tricolor Strip */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-[#138808]"></div>
      </div>

      {/* Main Gov Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Emblem Branding */}
          <div className="flex items-center space-x-3.5">
            {/* Lion Capital Emblem Styled Container */}
            <div className="w-12 h-12 bg-slate-100 border-2 border-slate-300 rounded-lg flex flex-col items-center justify-center p-1 shadow-inner">
              <Landmark className="w-6 h-6 text-[#0a2540]" />
              <span className="text-[8px] font-bold text-slate-700 tracking-tighter uppercase">सत्यमेव जयते</span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
                  भारत सरकार | GOVERNMENT OF INDIA
                </span>
                <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded font-bold border border-amber-300">
                  NATIONAL PROTOTYPE
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-[#0a2540] tracking-tight flex items-center gap-2">
                BHULEKH LEDGER <span className="text-xs font-medium text-slate-500 hidden sm:inline">| भूलेख लेज़र</span>
              </h1>
              <p className="text-[11px] text-slate-600 font-medium">
                Verifiable Digital Land Governance & Sovereign Ownership Infrastructure (DLRP-2026)
              </p>
            </div>
          </div>

          {/* User Profile & Role Switcher */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Quick Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 px-3.5 py-1.5 rounded-lg shadow-sm transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#0a2540] text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.full_name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                    {currentUser.full_name}
                    <span className="text-[10px] text-blue-600 font-medium">▼ Change Role</span>
                  </div>
                  <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
                </div>
              </button>

              {/* Role Switcher Menu */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Simulate Government Role</p>
                    <p className="text-[11px] text-slate-500">Switch user context to demo multi-department workflows</p>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition flex items-start gap-3 ${
                          currentUser.id === u.id ? 'bg-blue-50/70 border-l-4 border-[#0a2540]' : ''
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs mt-0.5">
                          {u.full_name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900">{u.full_name}</p>
                          <p className="text-[11px] text-slate-500">{u.department}</p>
                          <div className="mt-1">{getRoleBadge(u.role)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-[#0a2540] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('gis-map')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'gis-map'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Map className="w-4 h-4" />
              Cadastral GIS Map
            </button>

            {currentUser.role === 'CITIZEN' ? (
              <button
                onClick={() => setActiveTab('citizen-portal')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'citizen-portal'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                Citizen Portal & Holdings
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('officer-queue')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'officer-queue'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Officer Task Queue & SLA
              </button>
            )}

            <button
              onClick={() => setActiveTab('public-registry')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'public-registry'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Public Land Registry Search
            </button>

            <button
              onClick={() => setActiveTab('blockchain-ledger')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'blockchain-ledger'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4" />
              Cryptographic Ledger & Tamper Demo
            </button>

            <button
              onClick={() => setActiveTab('audit-trail')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'audit-trail'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              Statutory Audit Log
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
