"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { CustomerT } from "@/lib/types";
import { customerStatus, type ComputedStats } from "@/lib/stats";

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;display:grid;place-items:center;">
      <span style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const COLORS = {
  ordered: "#0f766e",
  visited: "#10b981",
  followup: "#f59e0b",
  notVisited: "#ef4444",
};

export function MapView({
  customers, areas, sectors, stats, onSelect,
}: {
  customers: CustomerT[];
  areas: { id: string; name: string }[];
  sectors: { id: string; code: string }[];
  stats: ComputedStats;
  onSelect: (id: string) => void;
}) {
  const withCoords = customers.filter((c) => c.lat && c.lng && c.active);
  const center: [number, number] = withCoords[0]
    ? [withCoords[0].lat!, withCoords[0].lng!]
    : [36.9, 7.77];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="absolute inset-0 h-full w-full"
      style={{ background: "#e8eef2" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map((c) => {
        const st = customerStatus(c, stats);
        const color = COLORS[st];
        return (
          <Marker
            key={c.id}
            position={[c.lat!, c.lng!]}
            icon={pinIcon(color)}
            eventHandlers={{ click: () => onSelect(c.id) }}
          >
            <Popup>
              <div style={{ minWidth: 140 }}>
                <b>{c.shopName}</b><br />
                {c.owner}<br />
                <span style={{ fontSize: 11, color: "#666" }}>
                  {sectors.find((s) => s.id === c.sectorId)?.code} • {areas.find((a) => a.id === c.areaId)?.name}
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
