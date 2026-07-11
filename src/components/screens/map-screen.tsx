"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { computeStats } from "@/lib/stats";
import { ScreenHeader } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, X, Phone } from "lucide-react";
import "leaflet/dist/leaflet.css";

const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">…</div>,
});

const COLORS = {
  ordered: "#0f766e",
  visited: "#10b981",
  followup: "#f59e0b",
  notVisited: "#ef4444",
};

export function MapScreen() {
  const t = useT();
  const go = useAppStore((s) => s.go);
  const { customers, areas, sectors, orders, visits, objective, rep } = useDataStore();
  const [selected, setSelected] = useState<string | null>(null);

  const stats = useMemo(
    () => computeStats(orders, visits, customers, objective, rep?.monthlyTargetCartons ?? 100),
    [orders, visits, customers, objective, rep]
  );

  const withCoords = customers.filter((c) => c.lat && c.lng && c.active);
  const selectedCustomer = customers.find((c) => c.id === selected);

  return (
    <div className="min-h-dynamic flex flex-col">
      <ScreenHeader title={t("map")} subtitle={`${withCoords.length} ${t("customers")}`} />

      {/* Legend */}
      <div className="px-4 py-2 flex gap-3 flex-wrap bg-background border-b">
        <Legend color={COLORS.ordered} label={t("ordered")} />
        <Legend color={COLORS.visited} label={t("visited")} />
        <Legend color={COLORS.followup} label={t("followUp")} />
        <Legend color={COLORS.notVisited} label={t("notVisited")} />
      </div>

      <div className="relative flex-1 min-h-[60vh]">
        <MapView
          customers={customers}
          areas={areas}
          sectors={sectors}
          stats={stats}
          onSelect={setSelected}
        />
      </div>

      {/* Selected customer sheet */}
      {selectedCustomer && (
        <div className="fixed bottom-0 inset-x-0 z-[1000] p-3 pb-safe">
          <Card className="p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted grid place-items-center font-bold text-muted-foreground">
                {selectedCustomer.shopName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{selectedCustomer.shopName}</p>
                <p className="text-sm text-muted-foreground truncate">{selectedCustomer.owner}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sectors.find((s) => s.id === selectedCustomer.sectorId)?.code} • {areas.find((a) => a.id === selectedCustomer.areaId)?.name}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button size="sm" className="h-10 rounded-xl tap-scale" onClick={() => go("customer", { customerId: selectedCustomer.id, returnTo: "map" })}>
                {t("visit")}
              </Button>
              <Button size="sm" variant="outline" className="h-10 rounded-xl tap-scale" onClick={() => { window.location.assign(`tel:${selectedCustomer.phone}`); }}>
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="h-10 rounded-xl tap-scale" onClick={() => selectedCustomer.lat && window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedCustomer.lat},${selectedCustomer.lng}`, "_blank")}>
                <Navigation className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ background: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
