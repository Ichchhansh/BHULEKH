'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { Parcel } from '@/lib/api';

interface LeafletMapInnerProps {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  onSelectParcel: (parcel: Parcel | null) => void;
}

// Controller component to smoothly pan/zoom to selected parcel
const MapController: React.FC<{ selectedParcel: Parcel | null }> = ({ selectedParcel }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedParcel) {
      map.flyTo([selectedParcel.centroid_lat, selectedParcel.centroid_lng], 16, {
        animate: true,
        duration: 1.2
      });
    }
  }, [selectedParcel, map]);

  return null;
};

export const LeafletMapInner: React.FC<LeafletMapInnerProps> = ({
  parcels,
  selectedParcel,
  onSelectParcel
}) => {
  // Center defaults to NCR / Ghaziabad cluster
  const defaultCenter: [number, number] = [28.6720, 77.4520];

  const getStyle = (parcel: Parcel, isSelected: boolean) => {
    let fillColor = '#10b981'; // Emerald (Clean)
    let borderColor = '#047857';

    if (parcel.is_disputed) {
      fillColor = '#ef4444'; // Red (Dispute)
      borderColor = '#991b1b';
    } else if (parcel.is_for_sale) {
      fillColor = '#8b5cf6'; // Purple (For Sale)
      borderColor = '#6d28d9';
    } else if (parcel.is_mortgaged) {
      fillColor = '#f59e0b'; // Amber (Mortgaged)
      borderColor = '#b45309';
    }

    return {
      fillColor: fillColor,
      fillOpacity: isSelected ? 0.75 : 0.45,
      color: isSelected ? '#0a2540' : borderColor,
      weight: isSelected ? 3.5 : 1.8,
      dashArray: isSelected ? '4, 4' : undefined,
    };
  };

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Crisp Light Basemap (CartoDB Positron / OSM) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapController selectedParcel={selectedParcel} />

        {parcels.map((p) => {
          let geojsonData;
          try {
            geojsonData = JSON.parse(p.geometry_geojson);
          } catch (e) {
            return null;
          }

          const isSelected = selectedParcel?.id === p.id;
          const style = getStyle(p, isSelected);

          const featureData: any = {
            type: 'Feature',
            properties: { id: p.id, name: p.khasra_no },
            geometry: geojsonData
          };

          return (
            <GeoJSON
              key={p.id + (isSelected ? '-selected' : '')}
              data={featureData}
              style={style}
              eventHandlers={{
                click: () => onSelectParcel(p),
                mouseover: (e) => {
                  const layer = e.target;
                  layer.setStyle({
                    fillOpacity: 0.8,
                    weight: 3,
                  });
                },
                mouseout: (e) => {
                  const layer = e.target;
                  layer.setStyle(style);
                }
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};
