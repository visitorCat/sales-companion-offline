"use client";

import dynamic from "next/dynamic";

const MapPickerInner = dynamic(() => import("./map-picker-inner"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">…</div>,
});

export function MapPicker({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  return <MapPickerInner lat={lat} lng={lng} onPick={onPick} />;
}
