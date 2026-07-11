"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { computeStats } from "@/lib/stats";
import { formatCartons, formatCurrency } from "@/lib/format";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import {
  TrendingUp, Package, MapPin, User, Users, Award, Sparkles, Loader2,
  ShoppingBag, Target, AlertTriangle, Lightbulb, ArrowUp, ArrowDown,
  RefreshCw as RefreshCwIcon, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { segmentCustomers, customerSegment } from "@/lib/segmentation";

export function DashboardScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const go = useAppStore((s) => s.go);
  const { customers, orders, visits, products, areas, objective, rep } = useDataStore();
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const stats = useMemo(
    () => computeStats(orders, visits, customers, objective, rep?.monthlyTargetCartons ?? 100),
    [orders, visits, customers, objective, rep]
  );

  // Build chart data from local store (works offline)
  const trend = useMemo(() => {
    const now = new Date();
    const arr: { day: string; cartons: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayO = orders.filter((o) => o.createdAt.slice(0, 10) === ds);
      arr.push({
        day: new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang, { weekday: "short" }).format(d),
        cartons: Math.round(dayO.reduce((s, o) => s + o.totalCartons, 0) * 10) / 10,
        orders: dayO.length,
      });
    }
    return arr;
  }, [orders, lang]);

  const topProducts = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const map: Record<string, { name: string; cartons: number }> = {};
    for (const o of orders) {
      if (o.createdAt.slice(0, 7) !== month) continue;
      for (const it of o.items ?? []) {
        const p = products.find((x) => x.id === it.productId);
        if (!map[it.productId]) map[it.productId] = { name: p?.name?.split(" ").slice(0, 2).join(" ") ?? "—", cartons: 0 };
        map[it.productId].cartons += it.qty;
      }
    }
    return Object.entries(map).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.cartons - a.cartons).slice(0, 5);
  }, [orders, products]);

  const bestAreaName = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const map: Record<string, number> = {};
    for (const o of orders) {
      if (o.createdAt.slice(0, 7) !== month) continue;
      const c = customers.find((x) => x.id === o.customerId);
      if (!c) continue;
      map[c.areaId] = (map[c.areaId] ?? 0) + o.totalCartons;
    }
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? areas.find((a) => a.id === top[0])?.name ?? "—" : "—";
  }, [orders, customers, areas]);

  const bestCustomerName = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const map: Record<string, number> = {};
    for (const o of orders) {
      if (o.createdAt.slice(0, 7) !== month) continue;
      map[o.customerId] = (map[o.customerId] ?? 0) + o.totalAmount;
    }
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return top ? customers.find((c) => c.id === top[0])?.shopName ?? "—" : "—";
  }, [orders, customers]);

  const objectionData = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const map: Record<string, number> = {};
    for (const v of visits) {
      if (v.createdAt.slice(0, 7) !== month || !v.objection) continue;
      map[v.objection] = (map[v.objection] ?? 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [visits]);

  const objectionColors = ["#0f766e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899", "#64748b"];

  // Weekly comparison: this week vs last week (cartons + orders)
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 6);
    thisWeekStart.setHours(0, 0, 0, 0);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1);
    const tw = orders.filter((o) => new Date(o.createdAt) >= thisWeekStart);
    const lw = orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= lastWeekStart && d <= lastWeekEnd;
    });
    return {
      thisWeek: { cartons: Math.round(tw.reduce((s, o) => s + o.totalCartons, 0) * 10) / 10, orders: tw.length },
      lastWeek: { cartons: Math.round(lw.reduce((s, o) => s + o.totalCartons, 0) * 10) / 10, orders: lw.length },
    };
  }, [orders]);

  // Area performance (top 6 by cartons this month)
  const areaPerformance = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const map: Record<string, { name: string; cartons: number; orders: number }> = {};
    for (const o of orders) {
      if (o.createdAt.slice(0, 7) !== month) continue;
      const c = customers.find((x) => x.id === o.customerId);
      if (!c) continue;
      const a = areas.find((x) => x.id === c.areaId);
      const name = a?.name ?? "—";
      if (!map[c.areaId]) map[c.areaId] = { name, cartons: 0, orders: 0 };
      map[c.areaId].cartons += o.totalCartons;
      map[c.areaId].orders += 1;
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.cartons - a.cartons)
      .slice(0, 6);
  }, [orders, customers, areas]);

  // Objection trend over last 4 weeks
  const objectionTrend = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; start: Date; end: Date; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const count = visits.filter((v) => {
        const d = new Date(v.createdAt);
        return d >= start && d <= end && v.objection;
      }).length;
      const label = i === 0 ? t("thisWeekC") : `S-${i}`;
      weeks.push({ label, start, end, count });
    }
    return weeks;
  }, [visits, t]);

  // Cumulative cartons over last 14 days (area chart)
  const cumulativeCartons = useMemo(() => {
    const now = new Date();
    const arr: { label: string; cumulative: number; daily: number }[] = [];
    let cumulative = 0;
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayO = orders.filter((o) => o.createdAt.slice(0, 10) === ds);
      const daily = Math.round(dayO.reduce((s, o) => s + o.totalCartons, 0) * 10) / 10;
      cumulative += daily;
      arr.push({
        label: new Intl.DateTimeFormat(lang === "ar" ? "ar" : lang, { day: "2-digit", month: "2-digit" }).format(d),
        cumulative: Math.round(cumulative * 10) / 10,
        daily,
      });
    }
    return arr;
  }, [orders, lang]);

  // Radar chart: area comparison (cartons, orders, visits) for top 6 areas
  const areaRadar = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const map: Record<string, { name: string; cartons: number; orders: number; visits: number }> = {};
    for (const a of areas) map[a.id] = { name: a.name, cartons: 0, orders: 0, visits: 0 };
    for (const o of orders) {
      if (o.createdAt.slice(0, 7) !== month) continue;
      const c = customers.find((x) => x.id === o.customerId);
      if (c && map[c.areaId]) {
        map[c.areaId].cartons += o.totalCartons;
        map[c.areaId].orders += 1;
      }
    }
    for (const v of visits) {
      if (v.createdAt.slice(0, 7) !== month) continue;
      const c = customers.find((x) => x.id === v.customerId);
      if (c && map[c.areaId]) map[c.areaId].visits += 1;
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.cartons - a.cartons)
      .slice(0, 6);
  }, [orders, visits, customers, areas]);

  // Customer segmentation
  const segments = useMemo(
    () => segmentCustomers(customers, orders, visits),
    [customers, orders, visits]
  );

  // Segment analytics: revenue per segment this month
  const segmentRevenue = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const map: Record<string, { revenue: number; orders: number; cartons: number }> = {};
    for (const o of orders) {
      if (o.createdAt.slice(0, 7) !== month) continue;
      const c = customers.find((x) => x.id === o.customerId);
      if (!c) continue;
      const seg = customerSegment(c, orders);
      if (!map[seg]) map[seg] = { revenue: 0, orders: 0, cartons: 0 };
      map[seg].revenue += o.totalAmount;
      map[seg].orders += 1;
      map[seg].cartons += o.totalCartons;
    }
    const segLabels: Record<string, string> = {
      vip: t("vip"), regular: t("regular"), occasional: t("occasional"),
      at_risk: t("atRisk"), new: t("newCustomers"), inactive: t("inactive"),
    };
    const segColors: Record<string, string> = {
      vip: "bg-amber-500", regular: "bg-emerald-500", occasional: "bg-sky-500",
      at_risk: "bg-rose-500", new: "bg-violet-500", inactive: "bg-zinc-400",
    };
    return Object.entries(map).map(([seg, v]) => ({
      seg,
      label: segLabels[seg] ?? seg,
      color: segColors[seg] ?? "bg-muted",
      ...v,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [orders, customers, t]);

  async function generateInsights() {
    try {
      const m = new Date().toISOString().slice(0,7);
      const mo = orders.filter(o=>o.createdAt.slice(0,7)===m);
      const mc = mo.reduce((s,o)=>s+o.totalCartons,0);
      const tgt = rep?.monthlyTargetCartons ?? 100;
      setInsights({ followUps: [], likelyToOrder: [], productsRising: [], productsSlowing: [], bestAreas: [], dailyRecommendations: [`${Math.max(0,tgt-mc)} cartons remaining`], monthlySummary: `Progress: ${Math.round(mc)}/${tgt}` });
    } catch { setInsights({ monthlySummary: t("error") }); }
    setInsightsLoading(false);
  }

  return (
    <div className="min-h-dynamic pb-28">
      <ScreenHeader title={t("dashboard")} showBack={false} right={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="tap-scale" onClick={() => go("delivery", { returnTo: "dashboard" })}>
            <Truck className="h-4 w-4 me-1" />
            {t("deliveries")}
          </Button>
          <Button variant="ghost" size="sm" className="tap-scale" onClick={() => go("reports", { returnTo: "dashboard" })}>
            {t("reports")}
          </Button>
        </div>
      } />

      {/* Objective big card */}
      <section className="px-4 pt-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t("monthlyTarget")}</span>
            </div>
            <Badge className="bg-primary/10 text-primary">{stats.completion}%</Badge>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold tabular-nums">{formatCartons(stats.monthCartons)}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {stats.target} {t("cartonsShort")}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-primary to-teal-500 rounded-full"
              initial={{ width: 0 }} animate={{ width: `${stats.completion}%` }} transition={{ duration: 0.6 }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div><p className="text-base font-bold tabular-nums text-emerald-600">{formatCartons(stats.todayCartons)}</p><p className="text-[10px] text-muted-foreground">{t("todayCartons")}</p></div>
            <div><p className="text-base font-bold tabular-nums text-primary">{formatCartons(stats.weekCartons)}</p><p className="text-[10px] text-muted-foreground">{t("weeklyCartons")}</p></div>
            <div><p className="text-base font-bold tabular-nums text-rose-600">{formatCartons(stats.remainingCartons)}</p><p className="text-[10px] text-muted-foreground">{t("remainingGoal")}</p></div>
          </div>
        </Card>
      </section>

      {/* Daily stats grid */}
      <section className="px-4 mt-3 grid grid-cols-2 gap-3">
        <DashStat icon={ShoppingBag} label={t("orders")} value={String(stats.dayOrders.length)} color="text-primary bg-primary/10" />
        <DashStat icon={TrendingUp} label={t("successRate")} value={`${stats.successRate}%`} color="text-emerald-600 bg-emerald-500/10" />
        <DashStat icon={Package} label={t("cartonsSold")} value={formatCartons(stats.todayCartons)} color="text-amber-600 bg-amber-500/10" />
        <DashStat icon={User} label={t("remainingCustomers")} value={String(stats.remainingCustomers)} color="text-rose-600 bg-rose-500/10" />
      </section>

      {/* 7-day trend */}
      <section className="px-4 mt-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" /> {t("thisWeek")}</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                <Line type="monotone" dataKey="cartons" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3, fill: "#0f766e" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Best of month */}
      <section className="px-4 mt-3 grid grid-cols-3 gap-3">
        <BestCard icon={Package} label={t("bestProduct")} value={topProducts[0]?.name ?? "—"} />
        <BestCard icon={MapPin} label={t("bestArea")} value={bestAreaName} />
        <BestCard icon={User} label={t("bestCustomer")} value={bestCustomerName} />
      </section>

      {/* Top products bar */}
      {topProducts.length > 0 && (
        <section className="px-4 mt-4">
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Award className="h-4 w-4 text-amber-500" /> {t("mostOrdered")}</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" width={70} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                  <Bar dataKey="cartons" radius={[0, 6, 6, 0]}>
                    {topProducts.map((_, i) => <Cell key={i} fill={objectionColors[i % objectionColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* Objections pie */}
      {objectionData.length > 0 && (
        <section className="px-4 mt-4">
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" /> {t("objectionReason")}</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={objectionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {objectionData.map((_, i) => <Cell key={i} fill={objectionColors[i % objectionColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* Weekly comparison */}
      <section className="px-4 mt-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" /> {t("weeklyComparison")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">{t("lastWeek")}</p>
              <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                {weeklyComparison.lastWeek.cartons}
              </p>
              <p className="text-[11px] text-muted-foreground">{weeklyComparison.lastWeek.orders} {t("orders")}</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3">
              <p className="text-[11px] text-primary mb-1 font-medium">{t("thisWeekC")}</p>
              <p className="text-2xl font-bold tabular-nums text-primary">
                {weeklyComparison.thisWeek.cartons}
              </p>
              <p className="text-[11px] text-primary/80">{weeklyComparison.thisWeek.orders} {t("orders")}</p>
              {weeklyComparison.lastWeek.cartons > 0 && (
                <p className="text-[10px] mt-1 font-semibold">
                  {weeklyComparison.thisWeek.cartons >= weeklyComparison.lastWeek.cartons ? "▲" : "▼"}{" "}
                  {Math.abs(Math.round(((weeklyComparison.thisWeek.cartons - weeklyComparison.lastWeek.cartons) / weeklyComparison.lastWeek.cartons) * 100))}%
                </p>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* Area performance bar chart */}
      {areaPerformance.length > 0 && (
        <section className="px-4 mt-4">
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" /> {t("areaPerformance")}
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaPerformance} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" width={70} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                  <Bar dataKey="cartons" radius={[0, 6, 6, 0]} fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* Objection trend line */}
      <section className="px-4 mt-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> {t("objectionTrend")}
          </p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={objectionTrend} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Cumulative cartons area chart */}
      <section className="px-4 mt-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" /> {t("cumulativeCartons")}
          </p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeCartons} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="#94a3b8" interval={1} />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                <Area type="monotone" dataKey="cumulative" stroke="#0f766e" strokeWidth={2.5} fill="url(#cumulGrad)" name={t("cumulativeCartons")} />
                <Area type="monotone" dataKey="daily" stroke="#14b8a6" strokeWidth={1.5} fill="url(#dailyGrad)" name={t("todayCartons")} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Area comparison radar chart */}
      {areaRadar.length >= 3 && (
        <section className="px-4 mt-4">
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" /> {t("areaComparison")}
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={areaRadar} outerRadius="70%">
                  <PolarGrid stroke="rgba(0,0,0,0.1)" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <Radar name={t("cartonsSold")} dataKey="cartons" stroke="#0f766e" fill="#0f766e" fillOpacity={0.4} strokeWidth={2} />
                  <Radar name={t("orders")} dataKey="orders" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={1.5} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* Customer segmentation */}
      <section className="px-4 mt-4">
        <Card className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" /> {t("customerSegments")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {segments.map((seg) => (
              <div
                key={seg.id}
                className={cn("rounded-xl p-2.5 text-center", seg.bg)}
              >
                <p className={cn("text-2xl font-bold tabular-nums leading-none", seg.color)}>
                  {seg.count}
                </p>
                <p className={cn("text-[10px] font-semibold mt-1", seg.color)}>{t(seg.label)}</p>
                <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">{t(seg.description)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Segment revenue analytics */}
      {segmentRevenue.length > 0 && (
        <section className="px-4 mt-4">
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" /> {t("segmentRevenue")}
            </p>
            <div className="space-y-2">
              {segmentRevenue.map((s) => {
                const maxRev = segmentRevenue[0]?.revenue ?? 1;
                const pct = Math.round((s.revenue / maxRev) * 100);
                return (
                  <div key={s.seg} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", s.color)} />
                        {s.label}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatCurrency(s.revenue, lang)} • {s.orders} {t("orders")}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", s.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {/* AI Insights */}
      <section className="px-4 mt-4">
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> {t("aiInsights")}
            </p>
            <Button size="sm" variant="outline" className="tap-scale" onClick={generateInsights} disabled={insightsLoading}>
              {insightsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" /> : <Sparkles className="h-3.5 w-3.5 me-1" />}
              {insights ? t("generateInsights") : t("generateInsights")}
            </Button>
          </div>
          {insightsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${80 - i * 10}%` }} />)}
            </div>
          ) : insights ? (
            <div className="space-y-3 text-sm">
              {insights.monthlySummary && (
                <div className="p-3 rounded-xl bg-card border">
                  <p className="font-medium mb-1">{t("thisMonth")}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{insights.monthlySummary}</p>
                </div>
              )}
              <InsightList title={t("followUp")} items={insights.followUps} icon={RefreshCwIcon} color="text-amber-600" />
              <InsightList title={t("likelyToOrder")} items={insights.likelyToOrder} icon={TrendingUp} color="text-emerald-600" />
              <InsightList title={t("bestProduct")} items={insights.productsRising} icon={ArrowUp} color="text-primary" />
              <InsightList title={t("products")} items={insights.productsSlowing} icon={ArrowDown} color="text-rose-600" />
              <InsightList title={t("dailyRecommendations")} items={insights.dailyRecommendations} icon={Lightbulb} color="text-amber-500" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("generateInsights")} →</p>
          )}
        </Card>
      </section>
    </div>
  );
}

function DashStat({ icon: Icon, label, value, color }: { icon: typeof Target; label: string; value: string; color: string }) {
  return (
    <Card className="p-3">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${color} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

function BestCard({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <Icon className="h-5 w-5 mx-auto text-primary mb-1" />
      <p className="text-xs font-semibold truncate leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</p>
    </Card>
  );
}

function InsightList({ title, items, icon: Icon, color }: { title: string; items?: string[]; icon: typeof Target; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold flex items-center gap-1 mb-1"><Icon className={`h-3.5 w-3.5 ${color}`} /> {title}</p>
      <ul className="space-y-1 ps-4">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-muted-foreground leading-relaxed list-disc list-outside">{it}</li>
        ))}
      </ul>
    </div>
  );
}
