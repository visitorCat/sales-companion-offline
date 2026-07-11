"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { computeStats } from "@/lib/stats";
import { formatCartons, formatCurrency, formatDate } from "@/lib/format";
import { ScreenHeader } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Download, Loader2, Calendar, ShoppingBag, Package,
  TrendingUp, Users, AlertTriangle, FileType2, FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ReportType = "daily" | "weekly" | "monthly";

export function ReportsScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const { orders, visits, customers, objective, rep } = useDataStore();
  const [type, setType] = useState<ReportType>("daily");
  const [exporting, setExporting] = useState<string | null>(null);

  const stats = computeStats(orders, visits, customers, objective, rep?.monthlyTargetCartons ?? 100);

  // Local preview data for the selected period
  const now = new Date();
  const from =
    type === "daily" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
    type === "weekly" ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6) :
    new Date(now.getFullYear(), now.getMonth(), 1);

  const periodOrders = orders.filter((o) => new Date(o.createdAt) >= from);
  const periodVisits = visits.filter((v) => new Date(v.createdAt) >= from);
  const totalCartons = periodOrders.reduce((s, o) => s + o.totalCartons, 0);
  const totalAmount = periodOrders.reduce((s, o) => s + o.totalAmount, 0);
  const visitedIds = new Set(periodVisits.map((v) => v.customerId));
  const successRate = periodVisits.length > 0
    ? Math.round((periodVisits.filter((v) => v.result === "ORDER_CREATED").length / periodVisits.length) * 100)
    : 0;

  async function exportFormat(format: "csv" | "json") {
    setExporting(format);
    try {
      // Local export
      if (!res.ok) throw new Error("export failed");
      if (format === "json") {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        downloadBlob(blob, `report-${type}-${from.toISOString().slice(0, 10)}.json`);
      } else {
        const text = await res.text();
        const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
        downloadBlob(blob, `report-${type}-${from.toISOString().slice(0, 10)}.csv`);
      }
      toast.success(t("exportDone"));
    } catch {
      toast.error(t("exportFailed"));
    }
    setExporting(null);
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    setExporting("pdf");
    try {
      // Local PDF export
      if (!res.ok) throw new Error("pdf export failed");
      const blob = await res.blob();
      downloadBlob(blob, `report-${type}-${from.toISOString().slice(0, 10)}.pdf`);
      toast.success(t("exportDone"));
    } catch {
      toast.error(t("exportFailed"));
    }
    setExporting(null);
  }

  async function exportXlsx() {
    setExporting("xlsx");
    try {
      // Local XLSX export
      if (!res.ok) throw new Error("xlsx export failed");
      const blob = await res.blob();
      downloadBlob(blob, `report-${type}-${from.toISOString().slice(0, 10)}.xlsx`);
      toast.success(t("exportDone"));
    } catch {
      toast.error(t("exportFailed"));
    }
    setExporting(null);
  }

  // local JSON export fallback (offline)
  function localExportJson() {
    const data = {
      meta: { type, rep: rep?.name, generatedAt: new Date().toISOString(), from: from.toISOString() },
      summary: {
        totalOrders: periodOrders.length,
        totalVisits: periodVisits.length,
        visitedShops: visitedIds.size,
        totalCartons: Math.round(totalCartons * 10) / 10,
        totalAmount: Math.round(totalAmount * 100) / 100,
        successRate,
      },
      orders: periodOrders,
      visits: periodVisits,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `report-${type}-${from.toISOString().slice(0, 10)}.json`);
    toast.success(t("exportDone"));
  }

  const types: { v: ReportType; key: string }[] = [
    { v: "daily", key: "reportDaily" },
    { v: "weekly", key: "reportWeekly" },
    { v: "monthly", key: "reportMonthly" },
  ];

  return (
    <div className="min-h-dynamic pb-28">
      <ScreenHeader title={t("reports")} />

      {/* Type selector */}
      <div className="px-4 pt-3 grid grid-cols-3 gap-2">
        {types.map((tp) => (
          <button
            key={tp.v}
            onClick={() => setType(tp.v)}
            className={cn(
              "h-11 rounded-xl text-sm font-medium border-2 transition-colors tap-scale",
              type === tp.v ? "border-primary bg-primary/5 text-primary" : "border-border"
            )}
          >
            {t(tp.key)}
          </button>
        ))}
      </div>

      {/* Period */}
      <div className="px-4 pt-3">
        <Card className="p-3 flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatDate(from, lang)}</span>
          <span className="text-muted-foreground">→</span>
          <span>{formatDate(now, lang)}</span>
        </Card>
      </div>

      {/* Summary */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-3">
        <SummaryCard icon={ShoppingBag} label={t("orders")} value={String(periodOrders.length)} color="text-primary bg-primary/10" />
        <SummaryCard icon={Users} label={t("visitedShops")} value={String(visitedIds.size)} color="text-emerald-600 bg-emerald-500/10" />
        <SummaryCard icon={Package} label={t("cartonsSold")} value={formatCartons(totalCartons)} color="text-amber-600 bg-amber-500/10" />
        <SummaryCard icon={TrendingUp} label={t("successRate")} value={`${successRate}%`} color="text-sky-600 bg-sky-500/10" />
      </div>

      <div className="px-4 pt-3">
        <Card className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("amount")}</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(totalAmount, lang)}</span>
        </Card>
      </div>

      {/* Recent orders */}
      <div className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("orders")}</p>
        <div className="space-y-2 max-h-64 overflow-y-auto scroll-thin">
          {periodOrders.slice(0, 20).map((o) => {
            const c = customers.find((x) => x.id === o.customerId);
            return (
              <Card key={o.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c?.shopName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.createdAt, lang)}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-semibold">{formatCartons(o.totalCartons)} {t("cartonsShort")}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(o.totalAmount, lang)}</p>
                </div>
              </Card>
            );
          })}
          {periodOrders.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">{t("noOrders")}</p>
          )}
        </div>
      </div>

      {/* Export */}
      <div className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("export")}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-18 rounded-2xl flex-col gap-1.5 tap-scale py-3" disabled={exporting === "pdf"} onClick={() => exportPdf()}>
            {exporting === "pdf" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6 text-rose-600" />}
            <span className="text-xs font-medium">{t("exportPdf")}</span>
          </Button>
          <Button variant="outline" className="h-18 rounded-2xl flex-col gap-1.5 tap-scale py-3" disabled={exporting === "xlsx"} onClick={() => exportXlsx()}>
            {exporting === "xlsx" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6 text-emerald-600" />}
            <span className="text-xs font-medium">{t("exportExcel")}</span>
          </Button>
          <Button variant="outline" className="h-18 rounded-2xl flex-col gap-1.5 tap-scale py-3" disabled={exporting === "csv"} onClick={() => exportFormat("csv")}>
            {exporting === "csv" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileType2 className="h-6 w-6 text-amber-600" />}
            <span className="text-xs font-medium">{t("exportCsv")}</span>
          </Button>
          <Button variant="outline" className="h-18 rounded-2xl flex-col gap-1.5 tap-scale py-3" disabled={exporting === "json"} onClick={() => exportFormat("json")}>
            {exporting === "json" ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6 text-sky-600" />}
            <span className="text-xs font-medium">{t("exportJson")}</span>
          </Button>
        </div>
        <Button variant="ghost" className="w-full mt-2 text-xs" onClick={localExportJson}>
          <Download className="h-3.5 w-3.5 me-1" /> {t("exportJson")} (offline)
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: typeof FileText; label: string; value: string; color: string }) {
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
