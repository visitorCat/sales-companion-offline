"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { computeStats, customerStatus, lastVisitOf, dueTodayCustomers } from "@/lib/stats";
import { formatCartons, formatCurrency, timeAgo } from "@/lib/format";
import { activePromotions } from "@/lib/promotions";
import { useScheduledVisits } from "@/store/scheduled-visits";
import { ScheduledVisitCard } from "@/components/shared/schedule-visit";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionTitle } from "@/components/shared/ui";
import {
  Route as RouteIcon, Search, UserPlus, Plus, Target, Footprints,
  ShoppingBag, Package, Clock, ChevronRight, TrendingUp, AlertCircle, Star, Tag,
  CalendarClock,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HomeScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const go = useAppStore((s) => s.go);
  const startRoute = useAppStore((s) => s.startRoute);
  const route = useAppStore((s) => s.route);
  const { customers, orders, visits, objective, rep, promotions } = useDataStore();

  const stats = useMemo(
    () => computeStats(orders, visits, customers, objective, rep?.monthlyTargetCartons ?? 100),
    [orders, visits, customers, objective, rep]
  );

  const remainingCustomers = customers.filter(
    (c) => c.active && !stats.visitedTodayIds.has(c.id)
  );

  // follow-ups: last visit result FOLLOW_UP and not visited today
  const followUps = customers.filter((c) => {
    const lv = lastVisitOf(c.id, visits);
    return lv?.result === "FOLLOW_UP" && !stats.visitedTodayIds.has(c.id);
  }).slice(0, 6);

  const activePromoList = activePromotions(promotions);

  // due today: customers whose estimated next purchase is due/overdue
  const dueToday = useMemo(
    () => dueTodayCustomers(customers, orders, stats.visitedTodayIds),
    [customers, orders, stats.visitedTodayIds]
  );

  // scheduled visits — select raw array to avoid new-array-each-render issues
  const allScheduled = useScheduledVisits((s) => s.visits);
  const markScheduledDone = useScheduledVisits((s) => s.markDone);
  const removeScheduled = useScheduledVisits((s) => s.remove);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayScheduled = useMemo(
    () => allScheduled.filter((v) => v.date === todayStr && !v.done).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
    [allScheduled, todayStr]
  );
  const upcomingScheduled = useMemo(
    () => allScheduled.filter((v) => v.date >= todayStr && !v.done).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "")),
    [allScheduled, todayStr]
  );

  function handleStartRoute() {
    const ids = remainingCustomers
      .sort((a, b) => a.visitOrder - b.visitOrder)
      .map((c) => c.id);
    if (ids.length === 0) {
      go("route", {});
      return;
    }
    startRoute(ids);
    go("route", {});
  }

  const estTime = remainingCustomers.length * 8; // ~8 min each
  const estTimeStr = estTime <= 0 ? "0" : estTime < 60 ? `${estTime}` : `${Math.floor(estTime / 60)}h${String(estTime % 60).padStart(2, "0")}`;

  return (
    <div className="pb-4">
      {/* Header */}
      <header className="px-4 pt-safe">
        <div className="flex items-center justify-between pt-3 pb-2">
          <div>
            <p className="text-xs text-muted-foreground">{t("todaysWork")}</p>
            <h1 className="text-xl font-bold tracking-tight">
              {rep?.name?.split(" ")[0] ?? t("appName")} 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-end">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("today")}</p>
              <p className="text-sm font-semibold">
                {new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-GB", {
                  day: "2-digit", month: "short",
                }).format(new Date())}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
              {rep?.name?.[0] ?? "R"}
            </div>
          </div>
        </div>
      </header>

      {/* Objective Tracker */}
      <section className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-teal-700 text-primary-foreground shadow-lg shadow-primary/20">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -left-6 -bottom-10 h-24 w-24 rounded-full bg-white/5" />
            <div className="relative p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("monthlyTarget")}</span>
                </div>
                <span className="text-2xl font-bold tabular-nums">
                  {stats.target}
                  <span className="text-sm font-normal opacity-80 ms-1">{t("cartonsShort")}</span>
                </span>
              </div>

              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold tabular-nums">{formatCartons(stats.monthCartons)}</span>
                <span className="text-sm opacity-80 mb-1">/ {stats.target} {t("cartonsShort")}</span>
                <span className="ms-auto text-sm font-semibold bg-white/20 rounded-full px-2 py-0.5">
                  {stats.completion}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.completion}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <Stat label={t("todayCartons")} value={formatCartons(stats.todayCartons)} />
                <Stat label={t("weeklyCartons")} value={formatCartons(stats.weekCartons)} />
                <Stat label={t("remainingCartons")} value={formatCartons(stats.remainingCartons)} />
              </div>
              <div className="flex items-center justify-between mt-3 text-xs opacity-90">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t("avgNeededPerDay")}: <b className="font-semibold">{formatCartons(stats.avgNeededPerDay)}</b> {t("cartonsShort")}/j
                </span>
                <span>{stats.daysLeftInMonth}j</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Quick actions */}
      <section className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            className="h-16 text-base font-semibold rounded-2xl tap-scale shadow-md shadow-primary/20"
            onClick={handleStartRoute}
          >
            <RouteIcon className="h-5 w-5 me-2" />
            {route.startedAt ? t("nextCustomer") : t("startRoute")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-base font-semibold rounded-2xl tap-scale"
            onClick={() => go("search", { returnTo: "home" })}
          >
            <Search className="h-5 w-5 me-2" />
            {t("search")}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Button
            variant="secondary"
            className="h-12 rounded-2xl tap-scale"
            onClick={() => go("newCustomer", { returnTo: "home" })}
          >
            <UserPlus className="h-4 w-4 me-2" />
            {t("newCustomer")}
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-2xl tap-scale"
            onClick={() => customers[0] && go("order", { customerId: customers[0].id, returnTo: "home" })}
          >
            <Plus className="h-4 w-4 me-2" />
            {t("newOrder")}
          </Button>
        </div>
      </section>

      {/* Today quick stats */}
      <SectionTitle>{t("today")}</SectionTitle>
      <section className="px-4 grid grid-cols-2 gap-3">
        <MiniStat icon={Footprints} label={t("visitedShops")} value={stats.visitedTodayIds.size} color="text-emerald-600 bg-emerald-500/10" />
        <MiniStat icon={ShoppingBag} label={t("orders")} value={stats.dayOrders.length} color="text-primary bg-primary/10" />
        <MiniStat icon={Package} label={t("cartonsSold")} value={formatCartons(stats.todayCartons)} color="text-amber-600 bg-amber-500/10" />
        <MiniStat icon={Clock} label={t("remainingCustomers")} value={stats.remainingCustomers} color="text-rose-600 bg-rose-500/10" />
      </section>

      {/* Today's route summary */}
      <SectionTitle
        action={
          <button className="text-xs text-primary font-medium flex items-center gap-0.5" onClick={() => go("route", {})}>
            {t("route")} <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          </button>
        }
      >
        {t("todayRoute")}
      </SectionTitle>
      <section className="px-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <RouteProgress
                visited={stats.visitedTodayIds.size}
                total={customers.filter((c) => c.active).length}
              />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">
                  {stats.visitedTodayIds.size} / {customers.filter((c) => c.active).length} {t("customers")}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> ~{estTimeStr} min
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-end">
              <span className="text-xs text-emerald-600 font-medium">✓ {stats.visitedTodayIds.size}</span>
              <span className="text-xs text-rose-600 font-medium">○ {stats.remainingCustomers}</span>
            </div>
          </div>
        </Card>
      </section>

      {/* Due today — customers whose next purchase is due/overdue */}
      {dueToday.length > 0 && (
        <>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
              {t("dueToday")}
            </span>
          </SectionTitle>
          <section className="px-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {dueToday.map(({ customer: c, est }) => {
                const isOverdue = est.daysOverdue >= 0;
                return (
                  <Card
                    key={c.id}
                    className={cn(
                      "shrink-0 w-52 p-3 tap-scale cursor-pointer border-2",
                      isOverdue ? "border-rose-300/60 bg-rose-50/40 dark:bg-rose-950/10" : "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10"
                    )}
                    onClick={() => go("customer", { customerId: c.id, returnTo: "home" })}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white",
                        isOverdue ? "bg-rose-500" : "bg-amber-500"
                      )}>
                        {isOverdue ? `+${est.daysOverdue}j` : t("today1")}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{c.rating}</span>
                    </div>
                    <p className="text-sm font-semibold truncate">{c.shopName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.owner}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {est.avgDays ? `${t("visitFrequencyAvg")}: ${est.avgDays}${t("days")}` : t("nextPurchaseEst")}
                    </p>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Active promotions */}
      {activePromoList.length > 0 && (
        <>
          <SectionTitle>{t("activePromotions")}</SectionTitle>
          <section className="px-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {activePromoList.map((p) => (
                <Card
                  key={p.id}
                  className="shrink-0 w-56 p-3 bg-gradient-to-br from-amber-50 to-amber-50/30 dark:from-amber-950/20 dark:to-transparent border-amber-300/50"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="h-3.5 w-3.5 text-amber-600" />
                    <Badge className="bg-amber-500 text-white border-0 text-[9px]">{t("promotion")}</Badge>
                  </div>
                  <p className="text-sm font-semibold leading-tight">{p.productName}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">{p.name}</p>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Scheduled visits */}
      {(todayScheduled.length > 0 || upcomingScheduled.length > 0) && (
        <>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              {t("scheduledVisits")}
            </span>
          </SectionTitle>
          <section className="px-4 space-y-2">
            {todayScheduled.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-primary uppercase tracking-wide px-1">{t("today1")}</p>
                {todayScheduled.map((sv) => (
                  <ScheduledVisitCard
                    key={sv.id}
                    visit={sv}
                    onOpen={() => go("customer", { customerId: sv.customerId, returnTo: "home" })}
                    onDone={() => markScheduledDone(sv.id)}
                    onRemove={() => removeScheduled(sv.id)}
                  />
                ))}
              </div>
            )}
            {upcomingScheduled.filter((sv) => sv.date !== todayStr).slice(0, 4).length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-1 mt-2">{t("upcoming")}</p>
                {upcomingScheduled.filter((sv) => sv.date !== todayStr).slice(0, 4).map((sv) => (
                  <ScheduledVisitCard
                    key={sv.id}
                    visit={sv}
                    onOpen={() => go("customer", { customerId: sv.customerId, returnTo: "home" })}
                    onDone={() => markScheduledDone(sv.id)}
                    onRemove={() => removeScheduled(sv.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Quick follow-ups */}
      <SectionTitle>{t("quickFollowUps")}</SectionTitle>
      <section className="px-4">
        {followUps.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 mx-auto mb-1 opacity-50" />
            {t("noFollowUps")}
          </Card>
        ) : (
          <div className="space-y-2">
            {followUps.map((c) => (
              <Card
                key={c.id}
                className="p-3 flex items-center gap-3 tap-scale cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => go("customer", { customerId: c.id, returnTo: "home" })}
              >
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 grid place-items-center">
                  <Star className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.shopName}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.owner} • {c.address ?? "—"}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 py-1.5">
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] opacity-80 mt-1 leading-none">{label}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value, color,
}: { icon: typeof Target; label: string; value: string | number; color: string }) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl grid place-items-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{label}</p>
      </div>
    </Card>
  );
}

function RouteProgress({ visited, total }: { visited: number; total: number }) {
  const pct = total > 0 ? (visited / total) * 100 : 0;
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
      <circle
        cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="4"
        className="text-primary" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
      />
    </svg>
  );
}
