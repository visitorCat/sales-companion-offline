"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useT } from "@/hooks/use-t";
import { formatCartons, formatCurrency } from "@/lib/format";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  PieChart, Pie, CartesianGrid,
} from "recharts";
import {
  Trophy, TrendingUp, Package, ShoppingBag, Users, Target,
  Loader2, Crown, ArrowUp, ArrowDown, Tag, Sparkles, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RepStat {
  id: string;
  name: string;
  email: string;
  target: number;
  monthCartons: number;
  monthRevenue: number;
  todayCartons: number;
  todayOrders: number;
  todayVisits: number;
  completion: number;
  customerCount: number;
  orderCount: number;
  promoDiscount: number;
  segmentBonus: number;
  totalDiscount: number;
}

export function ManagerScreen() {
  const t = useT();
  const go = useAppStore((s) => s.go);
  const [stats, setStats] = useState<RepStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
    try {
      const m = new Date().toISOString().slice(0,7);
      const rs = allReps.map(rep => {
        const ro = orders.filter(o=>o.repId===rep.id&&o.createdAt.slice(0,7)===m);
        const rc = customers.filter(c=>c.repId===rep.id&&c.active);
        const mc = ro.reduce((s,o)=>s+o.totalCartons,0);
        return { id:rep.id,name:rep.name,email:rep.email,target:rep.monthlyTargetCartons,monthCartons:Math.round(mc*10)/10,monthRevenue:Math.round(ro.reduce((s,o)=>s+o.totalAmount,0)),todayCartons:0,todayOrders:ro.length,todayVisits:0,completion:rep.monthlyTargetCartons>0?Math.round(mc/rep.monthlyTargetCartons*100):0,customerCount:rc.length,orderCount:ro.length,promoDiscount:0,segmentBonus:0,totalDiscount:0 };
      });
      setStats(rs);
    } catch {}
    setLoading(false);
  }
    load();
  }, [allReps, orders, customers, visits]);

  const totalRevenue = stats.reduce((s, r) => s + r.monthRevenue, 0);
  const totalDiscount = stats.reduce((s, r) => s + r.totalDiscount, 0);

  if (loading) {
    return (
      <div className="min-h-dynamic grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="min-h-dynamic">
        <ScreenHeader title={t("managerDashboard")} />
        <EmptyState title={t("error")} />
      </div>
    );
  }

  const maxCartons = Math.max(...stats.map((r) => r.monthCartons), 1);

  return (
    <div className="min-h-dynamic pb-28">
      <ScreenHeader title={t("managerDashboard")} showBack={true} />

      {/* Team summary */}
      <section className="px-4 pt-3">
        <Card className="p-4 bg-gradient-to-br from-primary to-teal-700 text-primary-foreground border-0 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative">
            <p className="text-sm opacity-90 flex items-center gap-1.5">
              <Trophy className="h-4 w-4" /> {t("teamPerformance")}
            </p>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div>
                <p className="text-2xl font-bold tabular-nums">{formatCartons(totalCartons)}</p>
                <p className="text-[10px] opacity-80">{t("monthlyCartons")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalRevenue, t("fr") as any).replace(" DZD", "")}</p>
                <p className="text-[10px] opacity-80">{t("amount")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{stats.length}</p>
                <p className="text-[10px] opacity-80">{t("customers")}</p>
              </div>
            </div>
            {totalDiscount > 0 && (
              <p className="text-[11px] opacity-80 mt-2">
                {t("discount")}: {formatCurrency(totalDiscount, t("fr") as any)}
              </p>
            )}
          </div>
        </Card>
      </section>

      {/* Rep leaderboard */}
      <section className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5" /> {t("leaderboard")}
        </p>
        <div className="space-y-2">
          {ranked.map((rep, i) => (
            <Card
              key={rep.id}
              className={cn(
                "p-4",
                i === 0 && "border-amber-300/60 bg-amber-50/30 dark:bg-amber-950/10"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className={cn(
                  "h-9 w-9 rounded-full grid place-items-center text-sm font-bold shrink-0",
                  i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-zinc-300 text-zinc-700" : i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
                </div>
                {/* Avatar + name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{rep.name}</p>
                  <p className="text-xs text-muted-foreground">{rep.customerCount} {t("customers")} • {rep.orderCount} {t("orders")}</p>
                </div>
                {/* Completion badge */}
                <Badge className={cn(
                  "border-0 text-[10px]",
                  rep.completion >= 80 ? "bg-emerald-500/15 text-emerald-600" :
                  rep.completion >= 50 ? "bg-amber-500/15 text-amber-600" :
                  "bg-rose-500/15 text-rose-600"
                )}>
                  {rep.completion}%
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>{formatCartons(rep.monthCartons)} / {rep.target} {t("cartonsShort")}</span>
                  <span>{formatCurrency(rep.monthRevenue, t("fr") as any)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      rep.completion >= 80 ? "bg-emerald-500" :
                      rep.completion >= 50 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${Math.min(100, rep.completion)}%` }}
                  />
                </div>
              </div>

              {/* Today's stats */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                <div className="text-center">
                  <p className="text-sm font-bold tabular-nums text-primary">{rep.todayCartons}</p>
                  <p className="text-[9px] text-muted-foreground">{t("todayCartons")}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold tabular-nums text-emerald-600">{rep.todayOrders}</p>
                  <p className="text-[9px] text-muted-foreground">{t("orders")}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold tabular-nums text-sky-600">{rep.todayVisits}</p>
                  <p className="text-[9px] text-muted-foreground">{t("visitedShops")}</p>
                </div>
              </div>

              {/* Discount breakdown */}
              {rep.totalDiscount > 0 && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                  <Tag className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">{t("promotion")}: {formatCurrency(rep.promoDiscount, t("fr") as any)}</span>
                  {rep.segmentBonus > 0 && (
                    <>
                      <Sparkles className="h-3 w-3 text-violet-500 ms-1" />
                      <span className="text-[10px] text-muted-foreground">{t("intelligence")}: {formatCurrency(rep.segmentBonus, t("fr") as any)}</span>
                    </>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Team comparison bar chart */}
      {ranked.length > 0 && (
        <section className="px-4 mt-4">
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" /> {t("teamComparison")}
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranked.map((r) => ({ name: r.name.split(" ")[0], cartons: r.monthCartons, target: r.target, revenue: r.monthRevenue }))} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                  <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cartons" name="Cartons" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}

      {/* Revenue distribution pie */}
      {ranked.length > 0 && (
        <section className="px-4 mt-4">
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-primary" /> {t("revenueDistribution")}
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ranked.map((r, i) => ({ name: r.name, value: r.monthRevenue }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name.split(" ")[0]} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 10 }}
                  >
                    {ranked.map((_, i) => (
                      <Cell key={i} fill={["#0f766e", "#f59e0b", "#8b5cf6", "#06b6d4"][i % 4]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
