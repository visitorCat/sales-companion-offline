"use client";

import { useMemo, useState } from "react";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { formatCurrency, formatCartons, formatDate, timeAgo } from "@/lib/format";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck, Package, Check, X, RotateCcw, Phone, MapPin, Clock,
  Plus, Loader2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DeliveryStatus, DeliveryT, OrderT } from "@/lib/types";

const statusConfig: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: typeof Truck }> = {
  PENDING: { label: "pending", color: "text-amber-600", bg: "bg-amber-500/15", icon: Clock },
  IN_TRANSIT: { label: "inTransit", color: "text-sky-600", bg: "bg-sky-500/15", icon: Truck },
  DELIVERED: { label: "delivered", color: "text-emerald-600", bg: "bg-emerald-500/15", icon: Check },
  CANCELLED: { label: "cancelled", color: "text-rose-600", bg: "bg-rose-500/15", icon: X },
  RETURNED: { label: "returned", color: "text-zinc-600", bg: "bg-zinc-500/15", icon: RotateCcw },
};

export function DeliveryScreen() {
  const t = useT();
  const lang = useT() as unknown as string;
  const { deliveries, orders, customers } = useDataStore();
  const [filter, setFilter] = useState<DeliveryStatus | "ALL">("ALL");
  const [creating, setCreating] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  // Orders without deliveries
  const ordersWithoutDelivery = useMemo(() => {
    const deliveryOrderIds = new Set(deliveries.map((d) => d.orderId));
    return orders.filter((o) => !deliveryOrderIds.has(o.id)).slice(0, 20);
  }, [orders, deliveries]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return deliveries;
    return deliveries.filter((d) => d.status === filter);
  }, [deliveries, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: deliveries.length };
    for (const d of deliveries) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [deliveries]);

  async function updateStatus(deliveryId: string, status: DeliveryStatus) {
    try {
      const { updateDelivery } = await import("@/lib/dexie-data");
      await updateDelivery(deliveryId, { status });
      const ds = useDataStore.getState();
      useDataStore.setState({ deliveries: ds.deliveries.map((d) => d.id === deliveryId ? { ...d, status, deliveredAt: status === "DELIVERED" ? new Date().toISOString() : d.deliveredAt } : d) });
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
    setCreating(false);
  }

  const filters: { v: DeliveryStatus | "ALL"; label: string }[] = [
    { v: "ALL", label: t("all") },
    { v: "PENDING", label: t("pending") },
    { v: "IN_TRANSIT", label: t("inTransit") },
    { v: "DELIVERED", label: t("delivered") },
  ];

  return (
    <div className="min-h-dynamic pb-28">
      <ScreenHeader title={t("deliveries")} subtitle={`${deliveries.length} ${t("orders")}`} showBack={false} />

      {/* Stats summary */}
      <section className="px-4 pt-3 grid grid-cols-4 gap-2">
        {(["PENDING", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as DeliveryStatus[]).map((s) => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          return (
            <Card key={s} className="p-2 text-center">
              <div className={cn("h-8 w-8 rounded-lg grid place-items-center mx-auto mb-1", cfg.bg)}>
                <Icon className={cn("h-4 w-4", cfg.color)} />
              </div>
              <p className={cn("text-lg font-bold tabular-nums leading-none", cfg.color)}>{counts[s] ?? 0}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{t(cfg.label)}</p>
            </Card>
          );
        })}
      </section>

      {/* Create delivery */}
      {ordersWithoutDelivery.length > 0 && (
        <section className="px-4 pt-4">
          <Card className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> {t("createDelivery")}
            </p>
            <div className="flex gap-2">
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="flex-1 h-10 rounded-xl bg-muted/60 border-0 text-sm px-3 outline-none"
              >
                <option value="">{t("selectOrder")}</option>
                {ordersWithoutDelivery.map((o) => {
                  const c = customers.find((x) => x.id === o.customerId);
                  return (
                    <option key={o.id} value={o.id}>
                      {c?.shopName ?? "—"} • {formatCartons(o.totalCartons)} {t("cartonsShort")} • {timeAgo(o.createdAt, lang)}
                    </option>
                  );
                })}
              </select>
              <Button
                className="h-10 rounded-xl tap-scale"
                disabled={!selectedOrderId || creating}
                onClick={createDelivery}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
        </section>
      )}

      {/* Filter tabs */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={cn(
              "shrink-0 h-9 px-3 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 tap-scale",
              filter === f.v ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"
            )}
          >
            {f.label}
            <span className={cn("text-[10px] rounded-full px-1", filter === f.v ? "bg-white/20" : "bg-muted")}>
              {counts[f.v] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Deliveries list */}
      <section className="px-4 pt-3 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={<Truck className="h-6 w-6" />} title={t("noDeliveries")} />
        ) : (
          filtered.map((d) => {
            const cfg = statusConfig[d.status];
            const StatusIcon = cfg.icon;
            return (
              <Card key={d.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", cfg.bg)}>
                    <StatusIcon className={cn("h-5 w-5", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{d.customerName}</p>
                      <Badge className={cn("text-[9px] border-0", cfg.bg, cfg.color)}>{t(cfg.label)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCartons(d.totalCartons)} {t("cartonsShort")} • {formatCurrency(d.totalAmount, lang)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {timeAgo(d.createdAt, lang)}
                      {d.deliveredAt && <span className="text-emerald-600">• ✓ {formatDate(d.deliveredAt, lang)}</span>}
                    </p>
                    {d.driverName && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {d.driverName}
                        {d.driverPhone && <Phone className="h-3 w-3 ms-1" />}
                      </p>
                    )}
                  </div>
                </div>
                {/* Status actions */}
                <div className="flex gap-1.5 mt-2 pt-2 border-t">
                  {d.status === "PENDING" && (
                    <Button size="sm" variant="outline" className="flex-1 h-8 rounded-lg tap-scale text-xs" onClick={() => updateStatus(d.id, "IN_TRANSIT")}>
                      <Truck className="h-3.5 w-3.5 me-1" /> {t("startDelivery")}
                    </Button>
                  )}
                  {d.status === "IN_TRANSIT" && (
                    <>
                      <Button size="sm" className="flex-1 h-8 rounded-lg tap-scale text-xs" onClick={() => updateStatus(d.id, "DELIVERED")}>
                        <Check className="h-3.5 w-3.5 me-1" /> {t("markDelivered")}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg tap-scale text-xs text-rose-600" onClick={() => updateStatus(d.id, "RETURNED")}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {d.status === "PENDING" && (
                    <Button size="sm" variant="ghost" className="h-8 rounded-lg tap-scale text-xs text-rose-600" onClick={() => updateStatus(d.id, "CANCELLED")}>
                      <X className="h-3.5 w-3.5 me-1" /> {t("cancel")}
                    </Button>
                  )}
                  {d.customerPhone && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 rounded-lg tap-scale shrink-0 p-0"
                      onClick={() => window.location.assign(`tel:${d.customerPhone}`)}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
