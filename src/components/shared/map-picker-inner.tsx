"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapPickerInner({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  const center: [number, number] = lat && lng ? [lat, lng] : [36.9, 7.77];
  const icon = L.divIcon({ className: "", html: '<span style="width:20px;height:20px;border-radius:50%;background:#0f766e;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);display:block;"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });

  function ClickHandler() { useMapEvents({ click(e: any) { onPick(e.latlng.lat, e.latlng.lng); } }); return null; }

  return (
    <MapContainer center={center} zoom={13} className="absolute inset-0 h-full w-full" style={{ background: "#e8eef2" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <ClickHandler />
      {lat && lng && <Marker position={[lat, lng]} icon={icon} />}
    </MapContainer>
  );
}
