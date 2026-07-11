"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { computeStats, dueTodayCustomers } from "@/lib/stats";
import { customerSegment, type SegmentId } from "@/lib/segmentation";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Route as RouteIcon, Check, SkipForward, Clock, Navigation,
  ChevronRight, Flag, Play, MapPin, X, Sparkles, Calendar,
} from "lucide-react";
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
  const { customers, areas, sectors, orders, visits, objective, rep, routePlans } = useDataStore();

  const [selectedSector, setSelectedSector] = useState<string>("all");

  const stats = useMemo(
    () => computeStats(orders, visits, customers, objective, rep?.monthlyTargetCartons ?? 100),
    [orders, visits, customers, objective, rep]
  );

  // Days from routePlans that have the selected sector assigned
  const sectorDays = useMemo(() => {
    const plans = (routePlans ?? []).filter((rp: any) => rp.sectorId && (selectedSector === "all" || rp.sectorId === selectedSector));
    return plans.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }, [routePlans, selectedSector]);

  const remaining = customers
    .filter((c) => c.active && !stats.visitedTodayIds.has(c.id))
    .filter((c) => selectedSector === "all" || c.sectorId === selectedSector)
    .sort((a, b) => a.visitOrder - b.visitOrder);

  // Smart route: prioritize due-today + at-risk + VIP customers first
  const dueToday = useMemo(
    () => dueTodayCustomers(customers, orders, stats.visitedTodayIds),
    [customers, orders, stats.visitedTodayIds]
  );
  const dueTodayIds = new Set(dueToday.map((d) => d.customer.id));

  const optimizedRoute = useMemo(() => {
    // Priority 1: due today (sorted by daysOverdue desc)
    // Priority 2: at-risk segment
    // Priority 3: VIP segment
    // Priority 4: rest by visitOrder
    const priority: { customer: typeof remaining[0]; priority: number }[] = remaining.map((c) => {
      const seg = customerSegment(c, orders);
      let priority = 4;
      if (dueTodayIds.has(c.id)) priority = 1;
      else if (seg === "at_risk") priority = 2;
      else if (seg === "vip") priority = 3;
      return { customer: c, priority };
    });
    return priority
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.customer.visitOrder - b.customer.visitOrder;
      })
      .map((p) => p.customer);
  }, [remaining, orders, dueTodayIds]);

  const [useOptimized, setUseOptimized] = useState(true);
  const routeCustomers = useOptimized ? optimizedRoute : remaining;

  const currentId = route.customerIds[route.index] ?? null;
  const current = customers.find((c) => c.id === currentId);
  const visitedCount = route.index;
  const remainingCount = Math.max(0, route.customerIds.length - route.index);
  const estMin = remainingCount * 8;

  // human-friendly duration: "6 h 30 min" or "45 min"
  function formatDuration(mins: number): string {
    if (mins <= 0) return "0";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}`;
    if (m === 0) return `${h}h`;
    return `${h}h${String(m).padStart(2, "0")}`;
  }

  const routeList = route.customerIds.map((id, i) => customers.find((c) => c.id === id)).filter(Boolean);

  function startNow() {
    const ids = routeCustomers.map((c) => c.id);
    if (ids.length === 0) return;
    startRoute(ids);
  }

  return (
    <div className="min-h-dynamic pb-4">
      <ScreenHeader title={t("route")} />

      {route.startedAt === null ? (
        // Not started
        <div className="px-4 pt-3 space-y-4">
          <Card className="p-4 text-center bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <RouteIcon className="h-10 w-10 mx-auto text-primary mb-2" />
            <h2 className="text-base font-semibold">{t("todayRoute")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {remaining.length} {t("remainingCustomers")}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <RouteStat label={t("remaining")} value={remaining.length} color="text-rose-600" />
              <RouteStat label={t("visitedCount")} value={stats.visitedTodayIds.size} color="text-emerald-600" />
              <RouteStat label="min" value={formatDuration(estMin)} color="text-primary" />
            </div>
          </Card>

          {remaining.length === 0 ? (
            <EmptyState icon={<Check className="h-6 w-6" />} title={t("noMoreCustomers")} />
          ) : (
            <>
              {/* Sector selector */}
              {sectors.length > 0 && (
                <Card className="p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {t("sector")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedSector("all")}
                      className={cn(
                        "px-3 h-8 rounded-lg text-xs font-medium border transition-colors tap-scale",
                        selectedSector === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      )}
                    >
                      {t("all")}
                    </button>
                    {sectors.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSector(s.id)}
                        className={cn(
                          "px-3 h-8 rounded-lg text-xs font-medium border transition-colors tap-scale",
                          selectedSector === s.id ? "bg-primary text-primary-foreground border-primary" : "border-border"
                        )}
                      >
                        {s.code}
                      </button>
                    ))}
                  </div>

                  {/* Days assigned to this sector (from Route Planning) */}
                  {sectorDays.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {t("planningDays")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sectorDays.map((d: any) => {
                          const sec = sectors.find((s) => s.id === d.sectorId);
                          return (
                            <Badge key={d.id} className="bg-primary/10 text-primary border-0 text-[10px]">
                              {d.day}{sec ? ` (${sec.code})` : ""}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Optimize toggle */}
              {dueToday.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-300/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-semibold">{t("smartRoute")}</p>
                      <p className="text-[10px] text-muted-foreground">{dueToday.length} {t("dueToday")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseOptimized(!useOptimized)}
                    className={cn("relative h-6 w-11 rounded-full transition-colors", useOptimized ? "bg-primary" : "bg-muted")}
                  >
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", useOptimized ? "translate-x-5" : "translate-x-0.5")} />
                  </button>
                </div>
              )}
              <Button className="w-full h-14 rounded-2xl text-base font-semibold tap-scale" onClick={startNow}>
                <Play className="h-5 w-5 me-2" /> {t("startRoute")}
              </Button>
              <div className="space-y-2">
                {routeCustomers.slice(0, 10).map((c, i) => {
                  const area = areas.find((a) => a.id === c.areaId);
                  const sector = sectors.find((s) => s.id === c.sectorId);
                  const isDue = dueTodayIds.has(c.id);
                  const seg = customerSegment(c, orders);
                  return (
                    <Card key={c.id} className={cn("p-3 flex items-center gap-3", isDue && "border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10")}>
                      <span className={cn("h-7 w-7 rounded-full text-xs font-bold grid place-items-center shrink-0", isDue ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground")}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.shopName}</p>
                        <p className="text-xs text-muted-foreground truncate">{sector?.code} • {area?.name}</p>
                      </div>
                      {isDue && <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[9px]">{t("dueToday")}</Badge>}
                      <Button variant="ghost" size="sm" className="tap-scale" onClick={() => go("customer", { customerId: c.id, returnTo: "route" })}>
                        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                      </Button>
                    </Card>
                  );
                })}
              </div>
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

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <Button
                    className="h-12 rounded-xl tap-scale font-semibold"
                    onClick={() => go("visit", { customerId: current.id, returnTo: "route" })}
                  >
                    <Play className="h-4 w-4 me-1" /> {t("visit")}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl tap-scale"
                    onClick={() => go("order", { customerId: current.id, returnTo: "route" })}
                  >
                    <RouteIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl tap-scale"
                    onClick={() => {
                      if (current.lat && current.lng) {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${current.lat},${current.lng}`, "_blank");
                      }
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl tap-scale text-xs"
                    onClick={() => { skipInRoute(); }}
                  >
                    <SkipForward className="h-4 w-4 me-1" /> {t("skipped")}
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

          {/* Upcoming list */}
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

function RouteStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-card border p-2 text-center">
      <p className={cn("text-xl font-bold tabular-nums", color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
