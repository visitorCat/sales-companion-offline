"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { ScreenHeader } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe, Sun, Moon, Monitor, Bell, Database, Lock, LogOut,
  Download, Upload, Building2, ShieldCheck, ChevronRight, Wifi, WifiOff,
  RefreshCw, Trash2, CloudUpload, CloudCheck, Calendar,
  Route as RouteIcon, Map, MapPin, Plus, ChevronUp, ChevronDown, X, Check,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSyncQueue, processQueue } from "@/store/sync-queue";
import type { Lang, Theme } from "@/lib/types";

export function SettingsScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const theme = useAppStore((s) => s.theme);
  const setLang = useAppStore((s) => s.setLang);
  const setTheme = useAppStore((s) => s.setTheme);
  const go = useAppStore((s) => s.go);
  const lock = useAppStore((s) => s.lock);
  const online = useAppStore((s) => s.online);
  const lastSyncedAt = useDataStore((s) => s.lastSyncedAt);
  const { rep, allReps, setRep } = useDataStore();
  const queue = useSyncQueue((s) => s.queue);
  const clearQueue = useSyncQueue((s) => s.clear);

  const langs: { v: Lang; label: string; flag: string }[] = [
    { v: "fr", label: "Français", flag: "🇫🇷" },
    { v: "ar", label: "العربية", flag: "🇩🇿" },
    { v: "en", label: "English", flag: "🇬🇧" },
  ];

  const themes: { v: Theme; label: string; icon: typeof Sun }[] = [
    { v: "light", label: t("light"), icon: Sun },
    { v: "dark", label: t("dark"), icon: Moon },
    { v: "system", label: t("system"), icon: Monitor },
  ];

  async function handleBackup() {
    try {
      const { db } = await import("@/lib/db-dexie");
      const [reps, sectors, areas, categories, products, customers, orders, visits, notes, promotions, objectives, scheduledVisits, deliveries, prefs] = await Promise.all([
        db.reps.toArray(), db.sectors.toArray(), db.areas.toArray(),
        db.categories.toArray(), db.products.toArray(), db.customers.toArray(),
        db.orders.toArray(), db.visits.toArray(), db.notes.toArray(),
        db.promotions.toArray(), db.objectives.toArray(), db.scheduledVisits.toArray(),
        db.deliveries.toArray(), db.prefs.toArray(),
      ]);
      const backup = {
        version: 3, exportedAt: new Date().toISOString(),
        reps, sectors, areas, categories, products, customers, orders, visits,
        notes, promotions, objectives, scheduledVisits, deliveries, prefs,
        appPrefs: localStorage.getItem("fsr-app-v1"),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SalesCompanion_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportDone"));
    } catch { toast.error(t("error")); }
  }

  async function handleRestore(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const { db } = await import("@/lib/db-dexie");
      if (data.reps) { await db.reps.clear(); for (const r of data.reps) await db.reps.put(r); }
      if (data.sectors) { await db.sectors.clear(); for (const s of data.sectors) await db.sectors.put(s); }
      if (data.areas) { await db.areas.clear(); for (const a of data.areas) await db.areas.put(a); }
      if (data.categories) { await db.categories.clear(); for (const c of data.categories) await db.categories.put(c); }
      if (data.products) { await db.products.clear(); for (const p of data.products) await db.products.put(p); }
      if (data.customers) { await db.customers.clear(); for (const c of data.customers) await db.customers.put(c); }
      if (data.orders) { await db.orders.clear(); for (const o of data.orders) await db.orders.put(o); }
      if (data.visits) { await db.visits.clear(); for (const v of data.visits) await db.visits.put(v); }
      if (data.notes) { await db.notes.clear(); for (const n of data.notes) await db.notes.put(n); }
      if (data.promotions) { await db.promotions.clear(); for (const p of data.promotions) await db.promotions.put(p); }
      if (data.objectives) { await db.objectives.clear(); for (const o of data.objectives) await db.objectives.put(o); }
      if (data.scheduledVisits) { await db.scheduledVisits.clear(); for (const v of data.scheduledVisits) await db.scheduledVisits.put(v); }
      if (data.deliveries) { await db.deliveries.clear(); for (const d of data.deliveries) await db.deliveries.put(d); }
      if (data.prefs) { await db.prefs.clear(); for (const p of data.prefs) await db.prefs.put(p); }
      toast.success(t("saved"));
      window.dispatchEvent(new Event("focus"));
    } catch { toast.error(t("error")); }
  }

  function handleLogout() {
    useDataStore.getState().setRep(null);
    useAppStore.getState().setUnlocked(false);
    useAppStore.setState({ screen: "home", history: [], params: {} });
  }

  return (
    <div className="min-h-dynamic pb-28">
      <ScreenHeader title={t("settings")} showBack={false} />

      {/* Profile */}
      <section className="px-4 pt-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center text-xl font-bold">
            {rep?.name?.[0] ?? "R"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{rep?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground truncate">{rep?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{rep?.phone}</p>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {online ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-rose-500" />}
            <span className={online ? "text-emerald-600" : "text-rose-600"}>{online ? t("online") : t("offline")}</span>
          </div>
        </Card>
        {lastSyncedAt && (
          <p className="text-[11px] text-muted-foreground mt-1 px-1">
            {t("sync")}: {new Date(lastSyncedAt).toLocaleTimeString()}
          </p>
        )}
      </section>

      {/* Language */}
      <section className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> {t("language")}
        </p>
        <Card className="p-2">
          {langs.map((l, i) => (
            <button
              key={l.v}
              onClick={() => setLang(l.v)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-colors tap-scale",
                lang === l.v ? "bg-primary/10" : "hover:bg-muted/50",
                i > 0 && "border-t border-border/50"
              )}
            >
              <span className="text-xl">{l.flag}</span>
              <span className={cn("flex-1 text-start text-sm font-medium", lang === l.v && "text-primary")}>{l.label}</span>
              {lang === l.v && <ShieldCheck className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </Card>
      </section>

      {/* Theme */}
      <section className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
          <Sun className="h-3.5 w-3.5" /> {t("theme")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((th) => {
            const Icon = th.icon;
            return (
              <button
                key={th.v}
                onClick={() => setTheme(th.v)}
                className={cn(
                  "h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors tap-scale",
                  theme === th.v ? "border-primary bg-primary/5 text-primary" : "border-border"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{th.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Options */}
      <section className="px-4 pt-4">
        <Card className="divide-y divide-border">
          <Row icon={Bell} label={t("notifications")}>
            <Button
              size="sm"
              variant="outline"
              className="tap-scale h-8 text-xs"
              onClick={async () => {
                const { requestNotificationPermission, sendTestNotification } = await import("@/components/shared/push-notifications");
                const granted = await requestNotificationPermission();
                if (granted) {
                  sendTestNotification("Sales Companion", t("notificationsEnabled"));
                  toast.success(t("notificationsEnabled"));
                } else {
                  toast.error(t("notificationsDenied"));
                }
              }}
            >
              {t("enable")}
            </Button>
          </Row>
          <Row icon={Database} label={t("autoBackup")} >
            <Switch defaultChecked />
          </Row>
        </Card>
      </section>

      {/* Backup */}
      <section className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("backup")}</p>
        <Card className="divide-y divide-border">
          <ActionRow icon={Download} label={t("manualBackup")} onClick={handleBackup} />
          <ActionRow icon={Upload} label={t("restoreBackup") || t("import")} onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = (e: any) => {
              const file = e.target.files?.[0];
              if (file) handleRestore(file);
            };
            input.click();
          }} />
        </Card>
      </section>

      {/* Sync Queue */}
      <section className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
          <CloudUpload className="h-3.5 w-3.5" /> {t("syncQueue")}
        </p>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {queue.length === 0 ? (
                <CloudCheck className="h-5 w-5 text-emerald-500" />
              ) : (
                <RefreshCw className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {queue.length === 0 ? t("syncedItems") : t("pendingSync")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {queue.length} {t("items")}
                  {lastSyncedAt && ` • ${new Date(lastSyncedAt).toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            {queue.length > 0 && (
              <Badge className="bg-amber-500/15 text-amber-600 border-0">
                {queue.length}
              </Badge>
            )}
          </div>
          {queue.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 rounded-xl tap-scale"
                onClick={() => { processQueue(); toast.info(t("sync")); }}
                disabled={!online}
              >
                <RefreshCw className="h-3.5 w-3.5 me-1" /> {t("retryAll")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 rounded-xl tap-scale text-destructive"
                onClick={() => { clearQueue(); toast.success(t("clearQueue")); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {queue.length > 0 && (
            <div className="mt-3 space-y-1 max-h-32 overflow-y-auto scroll-thin">
              {queue.slice(0, 8).map((job) => (
                <div key={job.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/40">
                  <span className="truncate">{job.kind} • {new Date(job.createdAt).toLocaleTimeString()}</span>
                  <span className="text-muted-foreground shrink-0 ms-2">
                    {job.attempts > 0 ? `×${job.attempts}` : "pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Route Planning — Days / Sectors / Areas editor */}
      <RoutePlanningSection />

      {/* Export by Period (Day / Week / Month) */}
      <ExportByPeriodSection />

      {/* Company */}
      <section className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("companyInfo")}</p>
        <Card className="divide-y divide-border">
          <Row icon={Building2} label={t("companyName")}>
            <span className="text-sm text-muted-foreground">FoodDist Co.</span>
          </Row>
        </Card>
      </section>

      {/* Account */}
      <section className="px-4 pt-4">
        <Card className="divide-y divide-border">
          <ActionRow icon={Lock} label={t("lock")} onClick={lock} />
          <ActionRow icon={LogOut} label={t("logout")} onClick={handleLogout} danger />
        </Card>
      </section>

      <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
        {t("appName")} v1.0 • Offline-first
      </p>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Sun; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function ActionRow({ icon: Icon, label, onClick, danger }: { icon: typeof Sun; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors tap-scale">
      <div className={cn("h-9 w-9 rounded-lg grid place-items-center", danger ? "bg-rose-500/10 text-rose-600" : "bg-muted text-muted-foreground")}>
        <Icon className="h-4 w-4" />
      </div>
      <span className={cn("flex-1 text-start text-sm font-medium", danger && "text-rose-600")}>{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
    </button>
  );
}

// ============================================================
//  Export by Period Section — export orders by Day / Week / Month
// ============================================================
function ExportByPeriodSection() {
  const t = useT();
  const { orders, customers, products } = useDataStore();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  function getPeriodOrders() {
    const date = new Date(exportDate);
    if (period === "day") {
      return orders.filter(o => o.createdAt.slice(0, 10) === exportDate);
    }
    if (period === "week") {
      // Get start of week (Monday)
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return orders.filter(o => {
        const od = new Date(o.createdAt);
        return od >= weekStart && od < weekEnd;
      });
    }
    // month
    const monthStart = exportDate.slice(0, 7);
    return orders.filter(o => o.createdAt.slice(0, 7) === monthStart);
  }

  function handleExport() {
    setExporting(true);
    try {
      const periodOrders = getPeriodOrders();
      if (periodOrders.length === 0) {
        toast.error(t("noOrdersForPeriod"));
        setExporting(false);
        return;
      }

      // 3 columns: Customer Name, Product Name, Quantity (name shown once)
      const rows: string[][] = [];
      rows.push(["Customer Name", "Product Name", "Quantity"]);

      const byCustomer: Record<string, { name: string; items: { product: string; qty: number }[] }> = {};
      const customerOrder: string[] = [];

      for (const o of periodOrders) {
        const customer = customers.find(c => c.id === o.customerId);
        const cName = customer?.shopName ?? "—";
        const cKey = o.customerId;

        if (!byCustomer[cKey]) {
          byCustomer[cKey] = { name: cName, items: [] };
          customerOrder.push(cKey);
        }

        if (o.items && o.items.length > 0) {
          for (const item of o.items) {
            const product = products.find(p => p.id === item.productId);
            byCustomer[cKey].items.push({
              product: product?.name ?? "—",
              qty: item.qty,
            });
          }
        } else {
          byCustomer[cKey].items.push({ product: "—", qty: 0 });
        }
      }

      for (const cKey of customerOrder) {
        const c = byCustomer[cKey];
        c.items.forEach((it, i) => {
          rows.push([
            i === 0 ? c.name : "",
            it.product,
            String(it.qty),
          ]);
        });
      }

      const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Orders_${period}_${exportDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportDone"));
    } catch {
      toast.error(t("exportFailed"));
    }
    setExporting(false);
  }

  const periodOrders = getPeriodOrders();

  return (
    <section className="px-4 pt-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" /> {t("exportByPeriod")}
      </p>
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="space-y-3">
          {/* Period selector */}
          <div className="grid grid-cols-3 gap-2">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "h-10 rounded-xl text-sm font-semibold border-2 transition-colors tap-scale",
                  period === p ? "border-primary bg-primary/5 text-primary" : "border-border"
                )}
              >
                {p === "day" ? t("exportDay") : p === "week" ? t("exportWeek") : t("exportMonth")}
              </button>
            ))}
          </div>

          {/* Date picker */}
          <div>
            <Label>{t("selectDate")}</Label>
            <Input
              type="date"
              className="mt-1 h-11"
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {periodOrders.length} {t("orders")}
          </p>

          <Button
            className="w-full h-11 rounded-xl tap-scale font-semibold"
            disabled={exporting || periodOrders.length === 0}
            onClick={handleExport}
          >
            <Download className="h-4 w-4 me-2" />
            {t("exportOrdersPeriod")}
          </Button>
        </div>
      </Card>
    </section>
  );
}

// ============================================================
//  Route Planning Section — full editor for days, sectors, areas
//  Uses existing routePlans table + existing sectors/areas tables.
// ============================================================
function RoutePlanningSection() {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="px-4 pt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase mb-2 tap-scale"
      >
        <RouteIcon className="h-3.5 w-3.5" /> {t("routePlanning")}
        <ChevronRight className={cn("h-3.5 w-3.5 ms-auto transition-transform", expanded && "rotate-90 rtl:-rotate-90")} />
      </button>
      {expanded && (
        <div className="space-y-4">
          <DaysEditor />
          <SectorsEditor />
          <AreasManagementSection />
        </div>
      )}
    </section>
  );
}

// ---- Days Editor ----
// Day definitions stored in routePlans table: { id, day: "DayName", sectorId, areaIds: [], order }
function DaysEditor() {
  const t = useT();
  const routePlans = useDataStore((s) => s.routePlans) ?? [];
  const sectors = useDataStore((s) => s.sectors) ?? [];
  const areas = useDataStore((s) => s.areas) ?? [];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...routePlans].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      const { db, uid } = await import("@/lib/db-dexie");
      const newDay = { id: uid("rp_"), day: newName.trim(), sectorId: "", areaIds: [] as string[], order: routePlans.length };
      await db.routePlans.add(newDay);
      useDataStore.setState({ routePlans: [...routePlans, newDay] });
      setNewName(""); setAdding(false);
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
  }

  async function handleRename(id: string, name: string) {
    try {
      const { db } = await import("@/lib/db-dexie");
      await db.routePlans.update(id, { day: name });
      useDataStore.setState({ routePlans: routePlans.map((rp: any) => rp.id === id ? { ...rp, day: name } : rp) });
    } catch { toast.error(t("error")); }
  }

  async function handleAssignSector(id: string, sectorId: string) {
    try {
      const { db } = await import("@/lib/db-dexie");
      await db.routePlans.update(id, { sectorId });
      useDataStore.setState({ routePlans: routePlans.map((rp: any) => rp.id === id ? { ...rp, sectorId } : rp) });
    } catch { toast.error(t("error")); }
  }

  async function handleReorder(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex((d: any) => d.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const newOrder = reordered.map((d: any, i: number) => ({ ...d, order: i }));
    useDataStore.setState({ routePlans: newOrder });
    try {
      const { db } = await import("@/lib/db-dexie");
      for (const d of newOrder) await db.routePlans.update(d.id, { order: d.order });
    } catch { toast.error(t("error")); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const { db } = await import("@/lib/db-dexie");
      await db.routePlans.delete(deleteId);
      useDataStore.setState({ routePlans: routePlans.filter((rp: any) => rp.id !== deleteId) });
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
    setDeleteId(null);
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary" /> {t("planningDays")}
        </p>
        <Button variant="ghost" size="sm" className="h-8 tap-scale text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3.5 w-3.5" /> {t("addDay")}
        </Button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-2">
          <Input className="h-9" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("dayName")}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} autoFocus />
          <Button size="sm" className="h-9 tap-scale" onClick={handleAdd} disabled={!newName.trim()}><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-9 tap-scale" onClick={() => { setAdding(false); setNewName(""); }}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">{t("noAreas")}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((d: any, i: number) => {
            const assignedSector = sectors.find((s: any) => s.id === d.sectorId);
            const sectorAreas = assignedSector ? areas.filter((a: any) => a.sectorId === assignedSector.id) : [];
            return (
              <div key={d.id} className="rounded-xl bg-muted/40 p-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    <button onClick={() => handleReorder(d.id, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30 tap-scale p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleReorder(d.id, 1)} disabled={i === sorted.length - 1} className="text-muted-foreground disabled:opacity-30 tap-scale p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <InlineEdit value={d.day} onSave={(v) => handleRename(d.id, v)} />
                  <Select value={d.sectorId || "none"} onValueChange={(v) => handleAssignSector(d.id, v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 w-36 text-xs rounded-lg border-0 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noSectorAssigned")}</SelectItem>
                      {sectors.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <button onClick={() => setDeleteId(d.id)} className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 grid place-items-center tap-scale shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {assignedSector && sectorAreas.length > 0 && (
                  <div className="ps-7 pt-1.5">
                    <p className="text-[10px] text-muted-foreground mb-1">{t("planningAreas")}:</p>
                    <div className="flex flex-wrap gap-1">
                      {sectorAreas.map((a: any) => (
                        <span key={a.id} className={cn("text-[10px] px-2 py-0.5 rounded-full border", d.areaIds?.includes(a.id) ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{a.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("deleteDayWarn")}</AlertDialogTitle><AlertDialogDescription> </AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ---- Sectors + Areas Editor ----
function SectorsEditor() {
  const t = useT();
  const sectors = useDataStore((s) => s.sectors) ?? [];
  const areas = useDataStore((s) => s.areas) ?? [];
  const upsertSector = useDataStore((s) => s.upsertSector);
  const removeSector = useDataStore((s) => s.removeSector);
  const upsertArea = useDataStore((s) => s.upsertArea);
  const removeArea = useDataStore((s) => s.removeArea);
  const setSectors = useDataStore((s) => s.setSectors);
  const setAreas = useDataStore((s) => s.setAreas);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [deleteSectorId, setDeleteSectorId] = useState<string | null>(null);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);
  const [addingArea, setAddingArea] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState("");

  const sortedSectors = [...sectors].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  async function handleAddSector() {
    if (!newName.trim()) return;
    try {
      const { createSector } = await import("@/lib/dexie-data");
      const s = await createSector({ name: newName.trim(), code: newCode.trim() || `S${sectors.length + 1}` });
      upsertSector(s); setNewName(""); setNewCode(""); setAdding(false);
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
  }

  async function handleRenameSector(id: string, name: string) {
    try {
      const { updateSector } = await import("@/lib/dexie-data");
      await updateSector(id, { name });
      const existing = sectors.find((s: any) => s.id === id);
      if (existing) upsertSector({ ...existing, name });
    } catch { toast.error(t("error")); }
  }

  async function handleReorderSectors(id: string, dir: -1 | 1) {
    const idx = sortedSectors.findIndex((s: any) => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sortedSectors.length) return;
    const reordered = [...sortedSectors];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const newOrder = reordered.map((s: any, i: number) => ({ ...s, order: i }));
    setSectors(newOrder);
    try { const { reorderSectors } = await import("@/lib/dexie-data"); await reorderSectors(newOrder.map((s: any) => s.id)); } catch { toast.error(t("error")); }
  }

  async function handleDeleteSector() {
    if (!deleteSectorId) return;
    try {
      const { deleteSector } = await import("@/lib/dexie-data");
      await deleteSector(deleteSectorId);
      removeSector(deleteSectorId);
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
    setDeleteSectorId(null);
  }

  async function handleAddArea(sectorId: string) {
    if (!newAreaName.trim()) return;
    try {
      const { createArea } = await import("@/lib/dexie-data");
      const a = await createArea({ sectorId, name: newAreaName.trim() });
      upsertArea(a); setNewAreaName(""); setAddingArea(null);
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
  }

  async function handleRenameArea(id: string, name: string) {
    try {
      const { updateArea } = await import("@/lib/dexie-data");
      await updateArea(id, { name });
      const existing = areas.find((a: any) => a.id === id);
      if (existing) upsertArea({ ...existing, name });
    } catch { toast.error(t("error")); }
  }

  async function handleReorderAreas(sectorId: string, id: string, dir: -1 | 1) {
    const sectorAreas = areas.filter((a: any) => a.sectorId === sectorId).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    const idx = sectorAreas.findIndex((a: any) => a.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sectorAreas.length) return;
    const reordered = [...sectorAreas];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const newOrder = reordered.map((a: any, i: number) => ({ ...a, order: i }));
    const otherAreas = areas.filter((a: any) => a.sectorId !== sectorId);
    setAreas([...otherAreas, ...newOrder]);
    try { const { reorderAreas } = await import("@/lib/dexie-data"); await reorderAreas(sectorId, newOrder.map((a: any) => a.id)); } catch { toast.error(t("error")); }
  }

  async function handleDeleteArea() {
    if (!deleteAreaId) return;
    try {
      const { deleteArea } = await import("@/lib/dexie-data");
      await deleteArea(deleteAreaId);
      removeArea(deleteAreaId);
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
    setDeleteAreaId(null);
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" /> {t("planningSectors")}
        </p>
        <Button variant="ghost" size="sm" className="h-8 tap-scale text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3.5 w-3.5" /> {t("addSector")}
        </Button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-2">
          <Input className="h-9 w-20" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder={t("sectorCode")} maxLength={6} />
          <Input className="h-9 flex-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("sectorName")}
            onKeyDown={(e) => e.key === "Enter" && handleAddSector()} autoFocus />
          <Button size="sm" className="h-9 tap-scale" onClick={handleAddSector} disabled={!newName.trim()}><Check className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="h-9 tap-scale" onClick={() => { setAdding(false); setNewName(""); setNewCode(""); }}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {sortedSectors.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">{t("noAreas")}</p>
      ) : (
        <div className="space-y-1.5">
          {sortedSectors.map((s: any, i: number) => {
            const sectorAreas = areas.filter((a: any) => a.sectorId === s.id).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            const isExpanded = expandedSector === s.id;
            return (
              <div key={s.id} className="rounded-xl bg-muted/40 overflow-hidden">
                <div className="flex items-center gap-1.5 p-2">
                  <div className="flex flex-col">
                    <button onClick={() => handleReorderSectors(s.id, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30 tap-scale p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleReorderSectors(s.id, 1)} disabled={i === sortedSectors.length - 1} className="text-muted-foreground disabled:opacity-30 tap-scale p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] shrink-0">{s.code}</Badge>
                  <InlineEdit value={s.name} onSave={(v) => handleRenameSector(s.id, v)} />
                  <button onClick={() => setExpandedSector(isExpanded ? null : s.id)} className="h-7 px-2 rounded-lg bg-background text-xs tap-scale shrink-0">{sectorAreas.length} {t("planningAreas")}</button>
                  <button onClick={() => setDeleteSectorId(s.id)} className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 grid place-items-center tap-scale shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>

                {isExpanded && (
                  <div className="px-2 pb-2 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase">{t("planningAreas")}</p>
                      <Button variant="ghost" size="sm" className="h-7 tap-scale text-[11px]" onClick={() => setAddingArea(addingArea === s.id ? null : s.id)}><Plus className="h-3 w-3" /> {t("addArea")}</Button>
                    </div>

                    {addingArea === s.id && (
                      <div className="flex gap-2 mb-1.5">
                        <Input className="h-8 text-xs" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder={t("areaName")}
                          onKeyDown={(e) => e.key === "Enter" && handleAddArea(s.id)} autoFocus />
                        <Button size="sm" className="h-8 tap-scale" onClick={() => handleAddArea(s.id)} disabled={!newAreaName.trim()}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 tap-scale" onClick={() => { setAddingArea(null); setNewAreaName(""); }}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}

                    {sectorAreas.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-2">{t("noAreas")}</p>
                    ) : (
                      <div className="space-y-1">
                        {sectorAreas.map((a: any, ai: number) => (
                          <div key={a.id} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-background/60">
                            <div className="flex flex-col">
                              <button onClick={() => handleReorderAreas(s.id, a.id, -1)} disabled={ai === 0} className="text-muted-foreground disabled:opacity-30 tap-scale p-0.5"><ChevronUp className="h-3 w-3" /></button>
                              <button onClick={() => handleReorderAreas(s.id, a.id, 1)} disabled={ai === sectorAreas.length - 1} className="text-muted-foreground disabled:opacity-30 tap-scale p-0.5"><ChevronDown className="h-3 w-3" /></button>
                            </div>
                            <InlineEdit value={a.name} onSave={(v) => handleRenameArea(a.id, v)} small />
                            <button onClick={() => setDeleteAreaId(a.id)} className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 grid place-items-center tap-scale shrink-0"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteSectorId} onOpenChange={(v) => !v && setDeleteSectorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("deleteSectorWarn")}</AlertDialogTitle><AlertDialogDescription> </AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSector} className="bg-destructive text-destructive-foreground">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAreaId} onOpenChange={(v) => !v && setDeleteAreaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("deleteAreaWarn")}</AlertDialogTitle><AlertDialogDescription> </AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteArea} className="bg-destructive text-destructive-foreground">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ---- Dedicated Areas Management Section ----
// Shows ALL sectors, each with its areas listed and an Add Area button.
function AreasManagementSection() {
  const t = useT();
  const sectors = useDataStore((s) => s.sectors) ?? [];
  const areas = useDataStore((s) => s.areas) ?? [];
  const upsertArea = useDataStore((s) => s.upsertArea);
  const removeArea = useDataStore((s) => s.removeArea);
  const setAreas = useDataStore((s) => s.setAreas);
  const [addingSector, setAddingSector] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState("");
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);

  const sortedSectors = [...sectors].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  function getSectorAreas(sectorId: string) {
    return areas.filter((a: any) => a.sectorId === sectorId).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }

  async function handleAddArea(sectorId: string) {
    if (!newAreaName.trim()) return;
    try {
      const { createArea } = await import("@/lib/dexie-data");
      const a = await createArea({ sectorId, name: newAreaName.trim() });
      upsertArea(a); setNewAreaName(""); setAddingSector(null);
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
  }

  async function handleRenameArea(id: string, name: string) {
    try {
      const { updateArea } = await import("@/lib/dexie-data");
      await updateArea(id, { name });
      const existing = areas.find((a: any) => a.id === id);
      if (existing) upsertArea({ ...existing, name });
    } catch { toast.error(t("error")); }
  }

  async function handleReorderArea(sectorId: string, id: string, dir: -1 | 1) {
    const sectorAreas = getSectorAreas(sectorId);
    const idx = sectorAreas.findIndex((a: any) => a.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sectorAreas.length) return;
    const reordered = [...sectorAreas];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const newOrder = reordered.map((a: any, i: number) => ({ ...a, order: i }));
    const otherAreas = areas.filter((a: any) => a.sectorId !== sectorId);
    setAreas([...otherAreas, ...newOrder]);
    try { const { reorderAreas } = await import("@/lib/dexie-data"); await reorderAreas(sectorId, newOrder.map((a: any) => a.id)); } catch { toast.error(t("error")); }
  }

  async function handleDeleteArea() {
    if (!deleteAreaId) return;
    try {
      const { deleteArea } = await import("@/lib/dexie-data");
      await deleteArea(deleteAreaId);
      removeArea(deleteAreaId);
      toast.success(t("saved"));
    } catch { toast.error(t("error")); }
    setDeleteAreaId(null);
  }

  if (sortedSectors.length === 0) {
    return (
      <Card className="p-3">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-1"><MapPin className="h-4 w-4 text-primary" /> {t("planningAreas")}</p>
        <p className="text-xs text-muted-foreground text-center py-3">{t("noAreas")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <p className="text-sm font-semibold flex items-center gap-1.5 mb-2"><MapPin className="h-4 w-4 text-primary" /> {t("planningAreas")}</p>
      <div className="space-y-3">
        {sortedSectors.map((s: any) => {
          const sectorAreas = getSectorAreas(s.id);
          return (
            <div key={s.id} className="rounded-xl bg-muted/40 p-2">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] shrink-0">{s.code}</Badge>
                <span className="text-sm font-medium truncate">{s.name}</span>
              </div>

              {sectorAreas.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-1.5">{t("noAreas")}</p>
              ) : (
                <div className="space-y-1 mb-1.5">
                  {sectorAreas.map((a: any, i: number) => (
                    <div key={a.id} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-background/60">
                      <div className="flex flex-col shrink-0">
                        <button onClick={() => handleReorderArea(s.id, a.id, -1)} disabled={i === 0} className="text-muted-foreground disabled:opacity-30 tap-scale p-0.5" aria-label={t("moveUp")}><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleReorderArea(s.id, a.id, 1)} disabled={i === sectorAreas.length - 1} className="text-muted-foreground disabled:opacity-30 tap-scale p-0.5" aria-label={t("moveDown")}><ChevronDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <InlineEdit value={a.name} onSave={(v) => handleRenameArea(a.id, v)} small />
                      <button onClick={() => setDeleteAreaId(a.id)} className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-600 grid place-items-center tap-scale shrink-0" aria-label={t("delete")}><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              {addingSector === s.id ? (
                <div className="flex gap-1.5 mt-1">
                  <Input className="h-8 text-xs flex-1" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder={t("areaName")}
                    onKeyDown={(e) => e.key === "Enter" && handleAddArea(s.id)} autoFocus />
                  <Button size="sm" className="h-8 tap-scale px-2" onClick={() => handleAddArea(s.id)} disabled={!newAreaName.trim()}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 tap-scale px-2" onClick={() => { setAddingSector(null); setNewAreaName(""); }}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <button onClick={() => { setAddingSector(s.id); setNewAreaName(""); }}
                  className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors tap-scale">
                  <Plus className="h-3 w-3" /> {t("addArea")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteAreaId} onOpenChange={(v) => !v && setDeleteAreaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("deleteAreaWarn")}</AlertDialogTitle><AlertDialogDescription> </AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteArea} className="bg-destructive text-destructive-foreground">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ---- Inline Edit helper (uses span to avoid nested-button HTML issues) ----
function InlineEdit({ value, onSave, small }: { value: string; onSave: (v: string) => void; small?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (editing) {
    return (
      <input
        className={cn("flex-1 min-w-0 bg-background border border-primary rounded-lg px-2 outline-none", small ? "h-7 text-xs" : "h-8 text-sm")}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val.trim() && val.trim() !== value) onSave(val.trim()); else setVal(value); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { if (val.trim() && val.trim() !== value) onSave(val.trim()); else setVal(value); setEditing(false); }
          if (e.key === "Escape") { setVal(value); setEditing(false); }
        }}
        onClick={(e) => e.stopPropagation()}
        autoFocus
      />
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); setVal(value); setEditing(true); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setVal(value); setEditing(true); } }}
      className={cn("flex-1 min-w-0 truncate hover:text-primary transition-colors cursor-text", small ? "text-xs" : "text-sm font-medium")}
    >
      {value}
    </span>
  );
}
