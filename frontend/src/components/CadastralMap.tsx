'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Parcel, User } from '@/lib/api';
import { 
  MapPin, ShieldAlert, CheckCircle2, AlertTriangle, Scale, 
  Building, TrendingUp, History, FileText, ArrowRight, Layers, Tag, Eye, Info, Landmark
} from 'lucide-react';

interface CadastralMapProps {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  onSelectParcel: (parcel: Parcel | null) => void;
  currentUser: User;
  onInitiateTransfer?: (parcel: Parcel) => void;
  onToggleSaleListing?: (parcel: Parcel, isForSale: boolean, priceLakhs?: number) => void;
}

const LeafletMapInner = dynamic(
  () => import('./LeafletMapInner').then((mod) => mod.LeafletMapInner),
  { ssr: false, loading: () => <div className="h-[600px] w-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium">Loading Cadastral GIS Engine...</div> }
);

export const CadastralMap: React.FC<CadastralMapProps> = ({
  parcels,
  selectedParcel,
  onSelectParcel,
  currentUser,
  onInitiateTransfer,
  onToggleSaleListing
}) => {
  const [filterState, setFilterState] = useState<string>('ALL');
  const [filterLandUse, setFilterLandUse] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [salePriceInputLakhs, setSalePriceInputLakhs] = useState<number>(125.0);
  const [isListingLoading, setIsListingLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedParcel?.listing_price_lakhs) {
      setSalePriceInputLakhs(selectedParcel.listing_price_lakhs);
    } else if (selectedParcel?.estimated_govt_value_lakhs) {
      setSalePriceInputLakhs(selectedParcel.estimated_govt_value_lakhs);
    }
  }, [selectedParcel]);

  const filteredParcels = parcels.filter(p => {
    if (filterState !== 'ALL' && p.state !== filterState) return false;
    if (filterLandUse !== 'ALL' && p.land_use !== filterLandUse) return false;
    if (filterStatus === 'FOR_SALE' && !p.is_for_sale) return false;
    if (filterStatus === 'DISPUTED' && !p.is_disputed) return false;
    if (filterStatus === 'MORTGAGED' && !p.is_mortgaged) return false;
    if (filterStatus === 'MY_PROPERTIES' && p.current_owner_id !== currentUser.id && p.current_owner_name !== currentUser.full_name) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = p.id.toLowerCase().includes(q) ||
                    p.khasra_no.toLowerCase().includes(q) ||
                    p.village.toLowerCase().includes(q) ||
                    p.district.toLowerCase().includes(q) ||
                    p.state.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW_RISK':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1 border border-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> LOW RISK (TITLE CLEAR)</span>;
      case 'REVIEW_REQUIRED':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1 border border-amber-300"><AlertTriangle className="w-3.5 h-3.5" /> REVIEW REQUIRED (ENCUMBERED)</span>;
      case 'HIGH_RISK':
        return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1 border border-red-300"><ShieldAlert className="w-3.5 h-3.5" /> HIGH RISK (DISPUTED/STAY)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Cadastral Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by Parcel ID (e.g. UP-GZB-IND-00012345 or KA-BNG-IND-00067123), Village, District..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#0a2540] focus:outline-none"
            />
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex gap-2">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700"
            >
              <option value="ALL">All States</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="MY_PROPERTIES">My Owned Parcels ({parcels.filter(p => p.current_owner_id === currentUser.id).length})</option>
              <option value="FOR_SALE">Available for Sale</option>
              <option value="DISPUTED">Court Disputed (Injunction)</option>
              <option value="MORTGAGED">Mortgaged (Bank Lien)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Layers className="w-4 h-4 text-[#0a2540]" />
          <span>Showing <strong>{filteredParcels.length}</strong> cadastral parcels</span>
        </div>
      </div>

      {/* Main Grid: Map on Left, Parcel Inspector Drawer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Map Viewport (8 Columns) */}
        <div className="lg:col-span-8 bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative min-h-[600px]">
          
          {/* Map Legend Banner */}
          <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-sm border border-slate-300 p-2.5 rounded-lg shadow-md text-[11px] font-semibold flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-800"></span>
              <span>Clean Title</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-purple-600 border border-purple-800"></span>
              <span>For Sale</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-700"></span>
              <span>Mortgaged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-red-600 border border-red-800"></span>
              <span>Court Disputed</span>
            </div>
          </div>

          <LeafletMapInner
            parcels={filteredParcels}
            selectedParcel={selectedParcel}
            onSelectParcel={onSelectParcel}
          />
        </div>

        {/* Parcel Inspector Drawer (4 Columns) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[650px] space-y-4">
          {selectedParcel ? (
            <div className="space-y-4">
              
              {/* Header Badge */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                    PARCEL IDENTIFIER (ULIN)
                  </span>
                  <h3 className="text-base font-extrabold text-[#0a2540] font-mono">
                    {selectedParcel.id}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedParcel.village}, Tehsil {selectedParcel.tehsil}, {selectedParcel.district}, {selectedParcel.state}
                  </p>
                  <p className="text-[10px] text-blue-900 font-semibold mt-1">
                    🏛️ {selectedParcel.revenue_authority}
                  </p>
                </div>
                <div>{getRiskBadge(selectedParcel.risk_rating)}</div>
              </div>

              {/* Notice Banner if Disputed or Mortgaged */}
              {selectedParcel.is_disputed && (
                <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded-r-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-900">
                    <Scale className="w-4 h-4 text-red-600" />
                    <span>Active Court Injunction / Stay Order</span>
                  </div>
                  <p className="text-red-800 text-[11px] leading-relaxed">
                    {selectedParcel.dispute_details || 'Case pending in Hon\'ble Court.'}
                  </p>
                  <p className="text-[10px] font-mono text-red-700">Ref: {selectedParcel.dispute_case_no}</p>
                </div>
              )}

              {selectedParcel.is_mortgaged && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Building className="w-4 h-4 text-amber-600" />
                    <span>Registered Bank Mortgage Lien (CERSAI)</span>
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    Lien in favor of <strong>{selectedParcel.mortgage_bank}</strong> for ₹{selectedParcel.mortgage_amount_lakhs} Lakhs. Statutory NOC required before alienation.
                  </p>
                </div>
              )}

              {/* Land Specs Table with Area in Sq. Ft. */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Khasra / Survey No</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedParcel.khasra_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Khatauni No</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedParcel.khata_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Land Classification</span>
                    <span className="font-bold text-slate-800">{selectedParcel.land_use}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Cadastral Area (Surveyed)</span>
                    <span className="font-extrabold text-[#0a2540]">{selectedParcel.area_sqft.toLocaleString()} sq ft</span>
                    <span className="text-[10px] text-slate-500 block">({selectedParcel.area_local_unit})</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-500 text-[11px] block">Statutory Recorded Owner</span>
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                    {selectedParcel.current_owner_name || 'Government Authority'}
                    {(selectedParcel.current_owner_id === currentUser.id || selectedParcel.current_owner_name === currentUser.full_name) && (
                      <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded font-bold">YOU (OWNER)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Government Circle Rate & Reference Valuation Panel in Lakhs / Crores */}
              <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0a2540] flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-blue-700" />
                    Circle Rate & Statutory Valuation
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">FY 2026-27</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="bg-white p-2 rounded border border-blue-200">
                    <span className="text-[10px] text-slate-500 block">Circle Rate (Per Sq. Ft.)</span>
                    <span className="font-extrabold text-blue-950 text-xs">₹{selectedParcel.circle_rate_sqft_2026.toLocaleString()}/sq ft</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-200">
                    <span className="text-[10px] text-slate-500 block">Circle Rate (Per Sq. M.)</span>
                    <span className="font-bold text-slate-700 text-xs">₹{selectedParcel.circle_rate_2026.toLocaleString()}/m²</span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded border border-blue-200 mt-2">
                  <span className="text-[11px] text-slate-600 block">
                    Circle Rate Based Estimated Govt Value:
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-base font-extrabold text-[#0a2540]">
                      {selectedParcel.formatted_value_str}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({selectedParcel.area_sqft.toLocaleString()} sq ft × ₹{selectedParcel.circle_rate_sqft_2026})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    *Statutory minimum benchmark for stamp duty assessment.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Citizen Landowner */}
              {(selectedParcel.current_owner_id === currentUser.id || selectedParcel.current_owner_name === currentUser.full_name) && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => onInitiateTransfer && onInitiateTransfer(selectedParcel)}
                    disabled={selectedParcel.is_disputed}
                    className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition ${
                      selectedParcel.is_disputed
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-[#0a2540] hover:bg-slate-800 text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    {selectedParcel.is_disputed ? 'Transfer Prohibited (Court Injunction)' : 'Sell / Apply for Ownership Mutation'}
                  </button>

                  {/* Toggle For Sale Listing with Indian Lakhs Input */}
                  <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-purple-950 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-700" />
                        Citizen Sale Intent Listing
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        selectedParcel.is_for_sale ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {selectedParcel.is_for_sale ? 'LISTED FOR SALE' : 'NOT LISTED'}
                      </span>
                    </div>

                    {!selectedParcel.is_for_sale && (
                      <div className="flex items-center gap-2 text-xs">
                        <label className="text-slate-600 text-[11px] font-semibold whitespace-nowrap">Asking Price (₹ Lakhs):</label>
                        <input
                          type="number"
                          value={salePriceInputLakhs}
                          onChange={(e) => setSalePriceInputLakhs(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-purple-300 rounded text-xs font-bold text-[#0a2540] bg-white"
                        />
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        if (onToggleSaleListing) {
                          setIsListingLoading(true);
                          await onToggleSaleListing(selectedParcel, !selectedParcel.is_for_sale, salePriceInputLakhs);
                          setIsListingLoading(false);
                        }
                      }}
                      disabled={isListingLoading}
                      className={`w-full text-xs py-2 rounded-lg font-bold transition shadow-sm ${
                        selectedParcel.is_for_sale
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-purple-700 text-white hover:bg-purple-800'
                      }`}
                    >
                      {isListingLoading ? 'Updating Listing...' : selectedParcel.is_for_sale ? 'Delist from Sale' : 'Mark Available for Sale'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <MapPin className="w-10 h-10 text-slate-300 stroke-1" />
              <p className="text-xs font-semibold text-slate-600">No Cadastral Parcel Selected</p>
              <p className="text-[11px] text-slate-500">
                Click any cadastral polygon boundary on the map to inspect title records, area in sq ft, circle rates, dispute statuses, and blockchain audit logs.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
