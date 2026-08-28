'use client';

import React, { useState } from 'react';
import { AuditEvent } from '@/lib/api';
import { Lock, ShieldAlert, CheckCircle2, Clock, Filter, Search } from 'lucide-react';

interface AuditTrailProps {
  events: AuditEvent[];
  onRefresh: () => void;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({ events, onRefresh }) => {
  const [filterAction, setFilterAction] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = events.filter(e => {
    if (filterAction !== 'ALL' && !e.action.includes(filterAction)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = e.entity_id.toLowerCase().includes(q) ||
                    e.actor_name.toLowerCase().includes(q) ||
                    e.action.toLowerCase().includes(q) ||
                    e.details.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('BREACH') || action.includes('TAMPER')) {
      return <span className="bg-red-100 text-red-900 border border-red-300 text-[10px] font-bold px-2 py-0.5 rounded">⚠ {action}</span>;
    }
    if (action.includes('REJECTED')) {
      return <span className="bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded">❌ {action}</span>;
    }
    if (action.includes('MINTED') || action.includes('APPROVED') || action.includes('COMMITTED')) {
      return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded">✓ {action}</span>;
    }
    return <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">{action}</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#0a2540] text-white text-[11px] px-2.5 py-0.5 rounded font-extrabold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> STATUTORY AUDIT LOG
              </span>
              <span className="text-slate-500 text-xs">Section 84 Evidence & Provenance Archive</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0a2540] mt-1">
              National Land Governance Immutable Event Trail
            </h2>
            <p className="text-xs text-slate-600">
              Every statutory decision, SLA alert, document hash verification, and blockchain emission is cryptographically logged.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search audit trail by Entity ID, Officer, or Action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#0a2540] focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700"
          >
            <option value="ALL">All Event Types</option>
            <option value="SLA">SLA Breaches & Escalations</option>
            <option value="APPROVED">Approvals & Signatures</option>
            <option value="REJECTED">Rejections & Orders</option>
            <option value="MINTED">Blockchain Block Minting</option>
            <option value="SUBMITTED">Applications Submitted</option>
          </select>
        </div>
      </div>

      {/* Events Timeline Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-y border-slate-200">
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Entity Ref</th>
                <th className="py-2.5 px-3">Actor & Role</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Statutory Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {new Date(e.timestamp).toUTCString()}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#0a2540] whitespace-nowrap">
                    {e.entity_id}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{e.actor_name}</div>
                    <div className="text-[10px] text-slate-500">{e.actor_role}</div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getActionBadge(e.action)}
                  </td>
                  <td className="py-3 px-3 text-slate-700 leading-relaxed text-[11px]">
                    {e.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
