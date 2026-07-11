"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

function pinIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;display:grid;place-items:center;">
      <span style="width:18px;height:18px;border-radius:50%;background:#0f766e;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export function LocationPickerMap({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : [36.9, 7.77];

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
      <ClickHandler onChange={onChange} />
      <Recenter lat={lat} lng={lng} />
      {lat !== null && lng !== null && (
        <Marker position={[lat, lng]} icon={pinIcon()} />
      )}
    </MapContainer>
  );
}
