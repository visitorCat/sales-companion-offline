"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { computeStats, dueTodayCustomers } from "@/lib/stats";
import { customerSegment } from "@/lib/segmentation";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Route as RouteIcon, Check, SkipForward, Clock, Navigation,
  ChevronRight, Flag, Play, MapPin, X, Sparkles, Calendar, ChevronLeft,
  ShoppingBag, Lock, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function RouteScreen() {
  const t = useT();
  const go = useAppStore((s) => s.go);
  const startRoute = useAppStore((s) => s.startRoute);
  const nextInRoute = useAppStore((s) => s.nextInRoute);
  const skipInRoute = useAppStore((s) => s.skipInRoute);
  const stopRoute = useAppStore((s) => s.stopRoute);
  const route = useAppStore((s) => s.route);
  const { customers, areas, sectors, orders, visits, objective, rep, routePlans, addVisit, upsertCustomer } = useDataStore();

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // Quick visit: save a CLOSED visit and go to next customer
  async function quickVisitNoOrder(customerId: string) {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    const tempId = `local-${Date.now()}`;
    const visit = {
      id: tempId,
      customerId,
      repId: rep?.id ?? "local",
      result: "CLOSED",
      objection: "SHOP_CLOSED",
      notes: null,
      durationSec: 0,
      createdAt: new Date().toISOString(),
    };
    addVisit(visit);
    upsertCustomer({ ...customer, lastVisitAt: visit.createdAt });
    try {
      const { createVisit } = await import("@/lib/dexie-data");
      const created = await createVisit({ customerId, repId: rep?.id ?? "local", result: "CLOSED", objection: "SHOP_CLOSED", notes: null, durationSec: 0 });
      const ds = useDataStore.getState();
      useDataStore.setState({ visits: ds.visits.map((v) => (v.id === tempId ? created : v)) });
    } catch { /* keep local */ }
    toast.success(t("visitSaved"));
    nextInRoute();
    go("route", {});
  }

  const stats = useMemo(
    () => computeStats(orders, visits, customers, objective, rep?.monthlyTargetCartons ?? 100),
    [orders, visits, customers, objective, rep]
  );

  // All route plan days (sorted by order)
  const allDays = useMemo(() => {
    return [...(routePlans ?? [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }, [routePlans]);

  // The selected day's sector
  const selectedDay = allDays.find((d: any) => d.id === selectedDayId);
  const selectedSector = selectedDay ? sectors.find((s) => s.id === selectedDay.sectorId) : null;

  // Customers in the selected day's sector (not visited today)
  const dayCustomers = useMemo(() => {
    if (!selectedSector) return [];
    return customers
      .filter((c) => c.active && !stats.visitedTodayIds.has(c.id))
      .filter((c) => c.sectorId === selectedSector.id)
      .sort((a, b) => a.visitOrder - b.visitOrder);
  }, [customers, selectedSector, stats.visitedTodayIds]);

  const dueToday = useMemo(
    () => dueTodayCustomers(customers, orders, stats.visitedTodayIds),
    [customers, orders, stats.visitedTodayIds]
  );
  const dueTodayIds = new Set(dueToday.map((d) => d.customer.id));

  const currentId = route.customerIds[route.index] ?? null;
  const current = customers.find((c) => c.id === currentId);
  const visitedCount = route.index;
  const remainingCount = Math.max(0, route.customerIds.length - route.index);
  const estMin = remainingCount * 8;

  function formatDuration(mins: number): string {
    if (mins <= 0) return "0";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}`;
    if (m === 0) return `${h}h`;
    return `${h}h${String(m).padStart(2, "0")}`;
  }

  const routeList = route.customerIds.map((id) => customers.find((c) => c.id === id)).filter(Boolean);

  function startNow() {
    const ids = dayCustomers.map((c) => c.id);
    if (ids.length === 0) return;
    startRoute(ids);
  }

  function startWithSelected(ids: string[]) {
    if (ids.length === 0) return;
    startRoute(ids);
  }

  return (
    <div className="min-h-dynamic pb-4">
      <ScreenHeader title={t("route")} />

      {route.startedAt === null ? (
        // Not started — Day selector flow
        <div className="px-4 pt-3 space-y-4">
          {/* Step 1: Select a Day */}
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> {t("planningDays")}
            </p>

            {allDays.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t("noAreas")}</p>
            ) : (
              <div className="space-y-2">
                {allDays.map((d: any) => {
                  const sec = sectors.find((s) => s.id === d.sectorId);
                  const isSel = selectedDayId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDayId(isSel ? null : d.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors tap-scale text-start",
                        isSel ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-xl grid place-items-center shrink-0", isSel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{d.day}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sec ? `${sec.code} — ${sec.name}` : t("noSectorAssigned")}
                        </p>
                      </div>
                      {isSel && <Check className="h-5 w-5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Step 2: Show customers in selected day's sector */}
          {selectedDay && selectedSector && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 text-center bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                <MapPin className="h-8 w-8 mx-auto text-primary mb-1" />
                <h2 className="text-base font-semibold">{selectedSector.code} — {selectedSector.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {dayCustomers.length} {t("remainingCustomers")}
                </p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <RouteStat label={t("remaining")} value={dayCustomers.length} color="text-rose-600" />
                  <RouteStat label={t("visitedCount")} value={stats.visitedTodayIds.size} color="text-emerald-600" />
                  <RouteStat label="min" value={formatDuration(dayCustomers.length * 8)} color="text-primary" />
                </div>
              </Card>

              {dayCustomers.length === 0 ? (
                <EmptyState icon={<Check className="h-6 w-6" />} title={t("noMoreCustomers")} />
              ) : (
                <>
                  <Button className="w-full h-14 rounded-2xl text-base font-semibold tap-scale" onClick={startNow}>
                    <Play className="h-5 w-5 me-2" /> {t("startRoute")}
                  </Button>

                  {/* Customer list with manual selection */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase px-1 mt-2">
                      {t("customers")} — {t("selectManually")}
                    </p>
                    {dayCustomers.map((c, i) => {
                      const area = areas.find((a) => a.id === c.areaId);
                      const isDue = dueTodayIds.has(c.id);
                      return (
                        <Card key={c.id} className={cn("p-3 flex items-center gap-3", isDue && "border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10")}>
                          <span className={cn("h-7 w-7 rounded-full text-xs font-bold grid place-items-center shrink-0", isDue ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground")}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.shopName}</p>
                            <p className="text-xs text-muted-foreground truncate">{selectedSector.code} • {area?.name}</p>
                          </div>
                          {isDue && <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[9px]">{t("dueToday")}</Badge>}
                          <Button variant="outline" size="sm" className="h-8 tap-scale text-xs" onClick={() => startWithSelected([c.id])}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="tap-scale" onClick={() => go("customer", { customerId: c.id, returnTo: "route" })}>
                            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Fallback: if no days configured, show all customers */}
          {allDays.length === 0 && (
            <>
              <Card className="p-4 text-center bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                <RouteIcon className="h-10 w-10 mx-auto text-primary mb-2" />
                <h2 className="text-base font-semibold">{t("todayRoute")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {customers.filter((c) => c.active && !stats.visitedTodayIds.has(c.id)).length} {t("remainingCustomers")}
                </p>
              </Card>
              {customers.filter((c) => c.active && !stats.visitedTodayIds.has(c.id)).length > 0 && (
                <Button className="w-full h-14 rounded-2xl text-base font-semibold tap-scale" onClick={() => startWithSelected(customers.filter((c) => c.active && !stats.visitedTodayIds.has(c.id)).map((c) => c.id))}>
                  <Play className="h-5 w-5 me-2" /> {t("startRoute")}
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        // In progress
        <div className="px-4 pt-3 space-y-4">
          {/* Progress bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("route")}</p>
                <p className="text-lg font-bold">{visitedCount} / {route.customerIds.length}</p>
              </div>
              <div className="text-end">
                <p className="text-xs text-muted-foreground">{t("estRemainingTime")}</p>
                <p className="text-lg font-bold flex items-center gap-1 justify-end">
                  <Clock className="h-4 w-4 text-primary" /> ~{formatDuration(estMin)}
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${route.customerIds.length ? (visitedCount / route.customerIds.length) * 100 : 0}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("visitedCount")} {visitedCount}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> {t("remaining")} {remainingCount}</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-400" /> {t("skipped")} {route.skipped.length}</span>
            </div>
          </Card>

          {/* Current customer */}
          {current ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 border-primary/40 ring-2 ring-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center">
                    {route.index + 1}
                  </span>
                  <Badge className="bg-primary/10 text-primary border-0">{t("nextCustomer")}</Badge>
                </div>
                <p className="text-lg font-bold">{current.shopName}</p>
                <p className="text-sm text-muted-foreground">{current.owner}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {sectors.find((s) => s.id === current.sectorId)?.code} • {areas.find((a) => a.id === current.areaId)?.name}
                </p>

                {/* Visit options: Visit (→ order directly), No Order (closed/absent), Navigate */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    className="h-14 rounded-xl tap-scale font-semibold"
                    onClick={() => go("order", { customerId: current.id, returnTo: "route", fromVisit: true })}
                  >
                    <Play className="h-5 w-5 me-2" /> {t("visit")}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 rounded-xl tap-scale"
                    onClick={() => quickVisitNoOrder(current.id)}
                  >
                    <Lock className="h-5 w-4 me-2" /> {t("closed")}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl tap-scale text-xs"
                    onClick={() => {
                      if (current.lat && current.lng) {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${current.lat},${current.lng}`, "_blank");
                      }
                    }}
                  >
                    <Navigation className="h-4 w-4 me-1" /> {t("navigate")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-10 rounded-xl tap-scale text-xs text-destructive"
                    onClick={() => { stopRoute(); go("endOfDay", { returnTo: "home" }); }}
                  >
                    <Flag className="h-4 w-4 me-1" /> {t("finishDay")}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : (
            <Card className="p-6 text-center">
              <Check className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-base font-semibold">{t("noMoreCustomers")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("finishDay")}</p>
              <Button className="w-full mt-4" onClick={() => { stopRoute(); go("endOfDay", { returnTo: "home" }); }}>
                <Flag className="h-4 w-4 me-1" /> {t("endOfDay")}
              </Button>
            </Card>
          )}

          {/* Upcoming list — clickable for manual selection */}
          {routeList.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">{t("route")}</p>
              <div className="space-y-1.5">
                {routeList.map((c, i) => {
                  if (!c) return null;
                  const done = i < route.index;
                  const isCurrent = i === route.index;
                  return (
                    <button
                      key={c.id}
                      onClick={() => go("customer", { customerId: c.id, returnTo: "route" })}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-colors text-start tap-scale",
                        isCurrent ? "border-primary bg-primary/5" : done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
                      )}
                    >
                      <span className={cn(
                        "h-7 w-7 rounded-full grid place-items-center text-xs font-bold shrink-0",
                        done ? "bg-emerald-500 text-white" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", done && "line-through text-muted-foreground")}>{c.shopName}</p>
                        <p className="text-xs text-muted-foreground truncate">{areas.find((a) => a.id === c.areaId)?.name}</p>
                      </div>
                      {isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px]">{t("nextCustomer")}</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RouteStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-card border p-2 text-center">
      <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
