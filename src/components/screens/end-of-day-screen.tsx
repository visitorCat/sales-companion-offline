"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { computeStats, lastVisitOf, customerOrders } from "@/lib/stats";
import { formatCartons, formatCurrency, formatDate } from "@/lib/format";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Flag, Check, Package, ShoppingBag, Users, Target, Award,
  Star, Clock, ChevronRight, Calendar, TrendingUp, Download, Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function EndOfDayScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const go = useAppStore((s) => s.go);
  const stopRoute = useAppStore((s) => s.stopRoute);
  const { customers, orders, visits, products, objective, rep } = useDataStore();

  const stats = useMemo(
    () => computeStats(orders, visits, customers, objective, rep?.monthlyTargetCartons ?? 100),
    [orders, visits, customers, objective, rep]
  );

  const dayOrders = stats.dayOrders;
  const dayVisits = stats.dayVisits;

  // Best customer today (by amount)
  const bestCustomerToday = useMemo(() => {
    const map: Record<string, { name: string; amount: number; cartons: number }> = {};
    for (const o of dayOrders) {
      const c = customers.find((x) => x.id === o.customerId);
      if (!c) continue;
      if (!map[c.id]) map[c.id] = { name: c.shopName, amount: 0, cartons: 0 };
      map[c.id].amount += o.totalAmount;
      map[c.id].cartons += o.totalCartons;
    }
    const top = Object.entries(map).sort((a, b) => b[1].amount - a[1].amount)[0];
    return top ? { id: top[0], ...top[1] } : null;
  }, [dayOrders, customers]);

  // Best product today (by cartons)
  const bestProductToday = useMemo(() => {
    const map: Record<string, { name: string; cartons: number }> = {};
    for (const o of dayOrders) {
      for (const it of o.items ?? []) {
        const p = products.find((x) => x.id === it.productId);
        if (!map[it.productId]) map[it.productId] = { name: p?.name ?? "—", cartons: 0 };
        map[it.productId].cartons += it.qty;
      }
    }
    const top = Object.entries(map).sort((a, b) => b[1].cartons - a[1].cartons)[0];
    return top ? { id: top[0], ...top[1] } : null;
  }, [dayOrders, products]);

  // Customers to revisit tomorrow (follow-up or not visited)
  const revisitTomorrow = useMemo(() => {
    return customers
      .filter((c) => c.active && !stats.visitedTodayIds.has(c.id))
      .slice(0, 6)
      .map((c) => ({ id: c.id, shopName: c.shopName, owner: c.owner }));
  }, [customers, stats]);

  const totalAmount = dayOrders.reduce((s, o) => s + o.totalAmount, 0);

  function finish() {
    stopRoute();
    go("home", {});
  }

  function goToExport() {
    // Stay on the End of Day screen — just scroll to the export section
    const exportSection = document.querySelector("[data-export-section]");
    if (exportSection) {
      exportSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <div className="min-h-dynamic pb-4">
      <ScreenHeader title={t("endOfDayTitle")} subtitle={formatDate(new Date(), lang)} />

      {/* Hero summary */}
      <section className="px-4 pt-3">
        <Card className="p-5 text-center bg-gradient-to-br from-primary to-teal-700 text-primary-foreground border-0 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <Flag className="h-8 w-8 mx-auto mb-2 opacity-90" />
          <p className="text-sm opacity-90">{t("endOfDayTitle")}</p>
          <p className="text-4xl font-bold mt-1 tabular-nums">{formatCartons(stats.todayCartons)}</p>
          <p className="text-sm opacity-80">{t("cartonsSold")}</p>
          <div className="flex justify-center gap-6 mt-4">
            <div>
              <p className="text-2xl font-bold tabular-nums">{dayOrders.length}</p>
              <p className="text-[11px] opacity-80">{t("orders")}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.visitedTodayIds.size}</p>
              <p className="text-[11px] opacity-80">{t("visitedShops")}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.successRate}%</p>
              <p className="text-[11px] opacity-80">{t("successRate")}</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Objective progress */}
      <section className="px-4 pt-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1.5"><Target className="h-4 w-4 text-primary" /> {t("monthlyTarget")}</span>
            <Badge className="bg-primary/10 text-primary">{stats.completion}%</Badge>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold tabular-nums">{formatCartons(stats.monthCartons)}</span>
            <span className="text-sm text-muted-foreground mb-0.5">/ {stats.target} {t("cartonsShort")}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${stats.completion}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("remainingGoal")}: <b className="font-semibold">{formatCartons(stats.remainingCartons)}</b> {t("cartonsShort")} • {t("avgNeededPerDay")}: {formatCartons(stats.avgNeededPerDay)}
          </p>
        </Card>
      </section>

      {/* Best of today */}
      <section className="px-4 pt-3 grid grid-cols-2 gap-3">
        <Card className="p-4" >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Award className="h-3.5 w-3.5 text-amber-500" /> {t("bestCustomerToday")}
          </div>
          {bestCustomerToday ? (
            <>
              <p className="text-sm font-semibold truncate">{bestCustomerToday.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(bestCustomerToday.amount, lang)}</p>
              <p className="text-xs text-primary font-medium">{formatCartons(bestCustomerToday.cartons)} {t("cartonsShort")}</p>
            </>
          ) : <p className="text-sm text-muted-foreground">{t("nothingToday")}</p>}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Package className="h-3.5 w-3.5 text-primary" /> {t("bestProductToday")}
          </div>
          {bestProductToday ? (
            <>
              <p className="text-sm font-semibold truncate">{bestProductToday.name}</p>
              <p className="text-xs text-primary font-medium mt-0.5">{formatCartons(bestProductToday.cartons)} {t("cartonsShort")}</p>
            </>
          ) : <p className="text-sm text-muted-foreground">{t("nothingToday")}</p>}
        </Card>
      </section>

      {/* Total amount */}
      <section className="px-4 pt-3">
        <Card className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("amount")}</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(totalAmount, lang)}</span>
        </Card>
      </section>

      {/* Revisit tomorrow */}
      <section className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {t("revisitTomorrow")}
        </p>
        {revisitTomorrow.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            <Check className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            {t("nothingToday")}
          </Card>
        ) : (
          <div className="space-y-2">
            {revisitTomorrow.map((c) => (
              <Card
                key={c.id}
                className="p-3 flex items-center gap-3 tap-scale cursor-pointer"
                onClick={() => go("customer", { customerId: c.id, returnTo: "endOfDay" })}
              >
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 grid place-items-center">
                  <Star className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.shopName}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.owner}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Daily Orders Export */}
      <div data-export-section>
        <DailyOrdersExport />
      </div>

      {/* Action */}
      <section className="px-4 pt-6 space-y-3">
        <Button variant="outline" className="w-full h-12 rounded-2xl tap-scale font-semibold" onClick={goToExport}>
          <Download className="h-5 w-5 me-2" /> {t("exportDailyOrders")}
        </Button>
        <Button className="w-full h-14 rounded-2xl text-base font-semibold tap-scale" onClick={finish}>
          <Check className="h-5 w-5 me-2" /> {t("done")}
        </Button>
      </section>
    </div>
  );
}

// ============================================================
//  Daily Orders Export Component
// ============================================================
function DailyOrdersExport() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const { orders, customers, products } = useDataStore();
  const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  function exportDailyOrders(format: "csv" | "excel") {
    setExporting(true);
    try {
      const dayOrders = orders.filter(o => o.createdAt.slice(0, 10) === exportDate);

      if (dayOrders.length === 0) {
        toast.error(t("noOrders"));
        setExporting(false);
        return;
      }

      // 3 columns: Customer Name, Product Name, Quantity
      // AGGREGATED: quantities summed per customer+product (no duplicates)
      const rows: string[][] = [];
      rows.push(["Customer Name", "Product Name", "Quantity"]);

      const aggregated: Record<string, { name: string; products: Record<string, number> }> = {};
      const customerOrder: string[] = [];

      for (const o of dayOrders) {
        const customer = customers.find(c => c.id === o.customerId);
        const cName = customer?.shopName ?? "—";
        const cKey = o.customerId;

        if (!aggregated[cKey]) {
          aggregated[cKey] = { name: cName, products: {} };
          customerOrder.push(cKey);
        }

        if (o.items && o.items.length > 0) {
          for (const item of o.items) {
            const product = products.find(p => p.id === item.productId);
            const pName = product?.name ?? "—";
            aggregated[cKey].products[pName] = (aggregated[cKey].products[pName] ?? 0) + item.qty;
          }
        }
      }

      for (const cKey of customerOrder) {
        const c = aggregated[cKey];
        const productNames = Object.keys(c.products);
        if (productNames.length === 0) {
          rows.push([c.name, "—", "0"]);
        } else {
          productNames.forEach((pName, i) => {
            rows.push([
              i === 0 ? c.name : "",
              pName,
              String(c.products[pName]),
            ]);
          });
        }
      }

      const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Orders_${exportDate}.${format === "excel" ? "csv" : "csv"}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportDone"));
    } catch {
      toast.error(t("exportFailed"));
    }
    setExporting(false);
  }

  const dayOrders = orders.filter(o => o.createdAt.slice(0, 10) === exportDate);

  return (
    <section className="px-4 pt-6">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Download className="h-4 w-4 text-primary" /> {t("exportDailyOrders") || "Export Daily Orders"}
        </p>
        <div className="space-y-3">
          <div>
            <Label>{t("selectDate") || "Select Date"}</Label>
            <Input
              type="date"
              className="mt-1 h-11"
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {dayOrders.length} {t("orders")} {t("today")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl tap-scale text-xs font-medium"
              disabled={exporting || dayOrders.length === 0}
              onClick={() => exportDailyOrders("excel")}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin me-1" /> : <Download className="h-4 w-4 me-1" />}
              Excel
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl tap-scale text-xs font-medium"
              disabled={exporting || dayOrders.length === 0}
              onClick={() => exportDailyOrders("csv")}
            >
              <Download className="h-4 w-4 me-1" /> CSV
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
