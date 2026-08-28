'use client';

import React, { useState } from 'react';
import { Parcel } from '@/lib/api';
import { 
  Search, MapPin, ShieldCheck, Scale, AlertTriangle, 
  Building2, TrendingUp, CheckCircle, Eye, FileText, ArrowRight, Tag, Landmark 
} from 'lucide-react';

interface PublicRegistryProps {
  parcels: Parcel[];
  onSelectParcelForMap: (parcel: Parcel) => void;
}

export const PublicRegistry: React.FC<PublicRegistryProps> = ({
  parcels,
  onSelectParcelForMap
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState('ALL');
  const [filterLandUse, setFilterLandUse] = useState('ALL');
  const [filterForSale, setFilterForSale] = useState(false);

  const filtered = parcels.filter(p => {
    if (filterState !== 'ALL' && p.state !== filterState) return false;
    if (filterLandUse !== 'ALL' && p.land_use !== filterLandUse) return false;
    if (filterForSale && !p.is_for_sale) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match = p.id.toLowerCase().includes(q) ||
                    p.ulin_pin.toLowerCase().includes(q) ||
                    p.khasra_no.toLowerCase().includes(q) ||
                    p.village.toLowerCase().includes(q) ||
                    p.district.toLowerCase().includes(q) ||
                    p.state.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Public Search Hero Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-900 text-[11px] px-2 py-0.5 rounded font-extrabold border border-blue-300">
                PUBLIC DOMAIN ACCESS (RTI COMPLIANT)
              </span>
              <span className="text-slate-500 text-xs">PII Protected & Sovereign Hashed</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0a2540] mt-1">
              National Cadastral Land Record Search & Valuation Explorer
            </h2>
            <p className="text-xs text-slate-600">
              Search verified property titles, Khasra boundaries, circle rates (per sq ft), and legal dispute statuses across India.
            </p>
          </div>
        </div>

        {/* Search Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              placeholder="Search by Parcel ID (UP-GZB-IND-00012345 or KA-BNG-IND-00067123), Village, District..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#0a2540] focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700"
            >
              <option value="ALL">All States</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterLandUse}
              onChange={(e) => setFilterLandUse(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700"
            >
              <option value="ALL">All Land Classifications</option>
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Agricultural">Agricultural</option>
              <option value="Industrial">Industrial</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterForSale}
              onChange={(e) => setFilterForSale(e.target.checked)}
              className="rounded text-[#0a2540] focus:ring-0"
            />
            <span className="font-semibold text-slate-700">Show only parcels marked &quot;Available for Sale&quot;</span>
          </label>

          <span>Showing <strong>{filtered.length}</strong> public parcel records</span>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition p-5 space-y-4">
            
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                    UNIQUE PARCEL IDENTIFIER
                  </span>
                  <span className="text-sm font-extrabold text-[#0a2540] font-mono">{p.id}</span>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  p.risk_rating === 'LOW_RISK' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : (
                    p.risk_rating === 'HIGH_RISK' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  )
                }`}>
                  {p.risk_rating === 'LOW_RISK' ? '✓ TITLE VERIFIED' : (p.risk_rating === 'HIGH_RISK' ? '⚠ DISPUTED' : '🔒 ENCUMBERED')}
                </span>
              </div>

              <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
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
                  <span className="text-slate-500">Classification:</span>
                  <strong className="text-slate-800">{p.land_use}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Cadastral Area:</span>
                  <strong className="text-[#0a2540] font-bold">{p.area_sqft.toLocaleString()} sq ft ({p.area_local_unit})</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Statutory Ownership:</span>
                  <strong className="text-emerald-700">✓ Statutorily Verified Title</strong>
                </p>
              </div>

              {/* Circle Rate Valuation Box in Lakhs / Crores */}
              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Circle Rate:</span>
                  <span className="font-bold text-slate-900">₹{p.circle_rate_sqft_2026.toLocaleString()}/sq ft</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-bold text-[#0a2540]">Circle Rate Reference Value:</span>
                  <span className="text-sm font-extrabold text-[#0a2540]">{p.formatted_value_str}</span>
                </div>
              </div>

              {p.is_for_sale && (
                <div className="bg-purple-100 text-purple-900 text-xs font-bold p-2.5 rounded-lg border border-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Listed for Sale by Owner</span>
                  <span>₹{p.listing_price_lakhs} Lakhs</span>
                </div>
              )}
            </div>

            <button
              onClick={() => onSelectParcelForMap(p)}
              className="w-full bg-[#0a2540] hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition"
            >
              <MapPin className="w-3.5 h-3.5" />
              View Cadastral Polygon on GIS Map
            </button>

          </div>
        ))}
      </div>

    </div>
  );
};
