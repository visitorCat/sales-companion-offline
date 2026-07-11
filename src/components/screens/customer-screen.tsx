"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import {
  customerOrders, customerVisits, avgOrderOf, lastOrderOf,
  estimateNextPurchase, visitFrequency, churnRisk,
} from "@/lib/stats";
import { customerProductAffinity } from "@/lib/affinity";
import { formatCurrency, formatDate, formatCartons, timeAgo } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { ScheduleVisitDialog } from "@/components/shared/schedule-visit";
import {
  Phone, MessageCircle, Navigation, ShoppingBag, PlayCircle,
  Star, MapPin, Clock, Package, TrendingUp, StickyNote, Plus, Trash2,
  CalendarPlus, Sparkles, AlertTriangle, CalendarClock, Tag, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { NoteType } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const ratingColors: Record<string, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-amber-500 text-white",
  C: "bg-zinc-400 text-white",
};

export function CustomerScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const params = useAppStore((s) => s.params);
  const go = useAppStore((s) => s.go);
  const { customers, sectors, areas, orders, visits, notes, prefs, rep, products, addNote, removeNote } = useDataStore();

  const customerId = params.customerId as string;
  const customer = customers.find((c) => c.id === customerId);

  const cOrders = useMemo(() => customerOrders(customerId, orders), [customerId, orders]);
  const cVisits = useMemo(() => customerVisits(customerId, visits), [customerId, visits]);
  const cNotes = useMemo(() => notes.filter((n) => n.customerId === customerId), [notes, customerId]);
  const cPrefs = prefs[customerId] ?? [];

  const [tab, setTab] = useState("stats");
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("CUSTOMER");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!customer) {
    return (
      <div>
        <ScreenHeader title={t("customerProfile")} />
        <EmptyState title={t("noCustomers")} />
      </div>
    );
  }

  const sector = sectors.find((s) => s.id === customer.sectorId);
  const area = areas.find((a) => a.id === customer.areaId);
  const lastOrd = lastOrderOf(customerId, orders);
  const avgOrder = avgOrderOf(customerId, orders);
  const totalCartons = cOrders.reduce((s, o) => s + o.totalCartons, 0);
  const visitFreq = cVisits.length > 0 ? `${cVisits.length} / 30j` : "—";
  const nextPurchase = estimateNextPurchase(customerId, orders);
  const avgVisitDays = visitFrequency(customerId, visits);

  const purchaseStatusConfig = {
    overdue: { label: t("nextPurchaseEst"), color: "bg-rose-500", text: "text-rose-600", icon: AlertTriangle, msg: `${nextPurchase.daysOverdue} ${t("days")}` },
    due: { label: t("nextPurchaseEst"), color: "bg-amber-500", text: "text-amber-600", icon: Clock, msg: t("today1") },
    notdue: { label: t("nextPurchaseEst"), color: "bg-emerald-500", text: "text-emerald-600", icon: CalendarClock, msg: `~${Math.abs(nextPurchase.daysOverdue)} ${t("days")}` },
    unknown: { label: t("nextPurchaseEst"), color: "bg-zinc-400", text: "text-muted-foreground", icon: Sparkles, msg: "—" },
  }[nextPurchase.status];

  const churn = churnRisk(customerId, orders);
  const churnConfig = {
    high: { label: t("highRisk"), color: "bg-rose-500 text-white", ring: "ring-rose-500/30" },
    medium: { label: t("mediumRisk"), color: "bg-amber-500 text-white", ring: "ring-amber-500/30" },
    low: { label: t("lowRisk"), color: "bg-emerald-500 text-white", ring: "ring-emerald-500/30" },
    none: { label: "", color: "", ring: "" },
  }[churn.risk];

  const affinitySuggestions = customerProductAffinity(customerId, orders, products);

  function call(phone: string) { window.location.assign(`tel:${phone}`); }
  function whatsapp(phone: string) {
    const n = phone.replace(/[^0-9]/g, "").replace(/^0/, "213");
    window.open(`https://wa.me/${n}`, "_blank");
  }
  function navigate(lat: number | null, lng: number | null) {
    if (lat && lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    const tempId = `local-${Date.now()}`;
    addNote({
      id: tempId,
      customerId,
      areaId: null,
      type: noteType,
      content: noteText.trim(),
      createdAt: new Date().toISOString(),
    });
    setNoteText("");
    toast.success(t("saved"));
    try {
      const { createNote } = await import("@/lib/dexie-data");
      const created = await createNote({ customerId, areaId: null, type: noteType, content: noteText.trim() });
      removeNote(tempId); addNote(created);
    } catch { /* keep local */ }
  }

  async function handleDeleteNote(id: string) {
    removeNote(id);
    try { const { deleteNote } = await import("@/lib/dexie-data"); await deleteNote(id); } catch {}
  }

  async function handleDeleteCustomer() {
    try {
      const { deleteCustomer } = await import("@/lib/dexie-data");
      await deleteCustomer(customerId);
      useDataStore.getState().removeCustomer(customerId);
      toast.success(t("saved"));
      go("home", {});
    } catch { toast.error(t("error")); }
  }

  // favorite products (top 4 by timesOrdered)
  const favProducts = [...cPrefs]
    .sort((a, b) => b.timesOrdered - a.timesOrdered)
    .slice(0, 4)
    .map((p) => {
      const prod = useDataStore.getState().products.find((x) => x.id === p.productId);
      return { ...p, name: prod?.name ?? "—" };
    });

  return (
    <div className="min-h-dynamic pb-4">
      <ScreenHeader
        title={customer.shopName}
        subtitle={`${sector?.code ?? ""} • ${area?.name ?? ""}`}
      />

      {/* Main info card */}
      <section className="px-4 pt-3">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-muted grid place-items-center text-lg font-bold text-muted-foreground">
                {customer.shopName[0]?.toUpperCase()}
              </div>
              <span className={cn(
                "absolute -top-1 -end-1 h-6 w-6 rounded-full grid place-items-center text-xs font-bold",
                ratingColors[customer.rating]
              )}>
                {customer.rating}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold truncate">{customer.shopName}</h2>
                {churn.risk !== "none" && (
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0", churnConfig.color)}>
                    {churnConfig.label}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{customer.owner}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {customer.address ?? area?.name ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
            <Info label={t("phone")} value={customer.phone} />
            <Info label={t("lastVisit")} value={customer.lastVisitAt ? timeAgo(customer.lastVisitAt, lang) : "—"} />
            <Info label={t("lastOrder")} value={customer.lastOrderAt ? timeAgo(customer.lastOrderAt, lang) : "—"} />
            <Info label={t("rating")} value={customer.rating} />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              className="h-12 rounded-xl tap-scale font-semibold"
              onClick={() => go("visit", { customerId, returnTo: "customer" })}
            >
              <PlayCircle className="h-4 w-4 me-2" />
              {t("startVisit")}
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl tap-scale font-semibold"
              onClick={() => go("order", { customerId, returnTo: "customer" })}
            >
              <ShoppingBag className="h-4 w-4 me-2" />
              {t("createOrder")}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Button variant="secondary" size="sm" className="h-10 rounded-xl tap-scale" onClick={() => call(customer.phone)}>
              <Phone className="h-4 w-4 me-1" /> {t("call")}
            </Button>
            <Button variant="secondary" size="sm" className="h-10 rounded-xl tap-scale" onClick={() => whatsapp(customer.phone)}>
              <MessageCircle className="h-4 w-4 me-1" /> {t("whatsapp")}
            </Button>
            <Button variant="secondary" size="sm" className="h-10 rounded-xl tap-scale" onClick={() => navigate(customer.lat, customer.lng)}>
              <Navigation className="h-4 w-4 me-1" /> {t("navigate")}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 rounded-xl tap-scale mt-2 border-primary/30 text-primary"
            onClick={() => setScheduleOpen(true)}
          >
            <CalendarPlus className="h-4 w-4 me-2" />
            {t("scheduleVisit")}
          </Button>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl tap-scale"
              onClick={() => go("newCustomer", { customerId, returnTo: "customer", editMode: true })}
            >
              <Pencil className="h-4 w-4 me-1" /> {t("editCustomer")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl tap-scale text-destructive border-destructive/30"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 me-1" /> {t("deleteCustomer")}
            </Button>
          </div>
        </Card>
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCustomer")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteCustomerWarn")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCustomer} className="bg-destructive text-destructive-foreground">{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScheduleVisitDialog open={scheduleOpen} onOpenChange={setScheduleOpen} customerId={customerId} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList className="grid grid-cols-4 mx-4 w-auto">
          <TabsTrigger value="stats">{t("statistics")}</TabsTrigger>
          <TabsTrigger value="orders">{t("orders")}</TabsTrigger>
          <TabsTrigger value="history">{t("history")}</TabsTrigger>
          <TabsTrigger value="notes">{t("notes")}</TabsTrigger>
        </TabsList>

        {/* Stats */}
        <TabsContent value="stats" className="px-4 mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={TrendingUp} label={t("avgOrder")} value={avgOrder > 0 ? formatCurrency(avgOrder, lang) : "—"} color="text-primary bg-primary/10" />
            <StatCard icon={Package} label={t("cartonsSold")} value={formatCartons(totalCartons)} color="text-amber-600 bg-amber-500/10" />
            <StatCard icon={Clock} label={t("visitFrequency")} value={visitFreq} color="text-sky-600 bg-sky-500/10" />
            <StatCard icon={ShoppingBag} label={t("orders")} value={String(cOrders.length)} color="text-emerald-600 bg-emerald-500/10" />
          </div>

          {favProducts.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" /> {t("favoriteProducts")}
              </p>
              <div className="space-y-1.5">
                {favProducts.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <Badge variant="secondary" className="text-xs">×{p.timesOrdered}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Customer Intelligence Card */}
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> {t("intelligence")}
            </p>
            {/* Estimated next purchase */}
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("h-10 w-10 rounded-xl grid place-items-center text-white shrink-0", purchaseStatusConfig.color)}>
                <purchaseStatusConfig.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("nextPurchaseEst")}</p>
                <p className={cn("text-sm font-bold", purchaseStatusConfig.text)}>{purchaseStatusConfig.msg}</p>
              </div>
              {nextPurchase.avgDays && (
                <div className="text-end">
                  <p className="text-[11px] text-muted-foreground">{t("visitFrequencyAvg")}</p>
                  <p className="text-sm font-semibold">{nextPurchase.avgDays} {t("days")}</p>
                </div>
              )}
            </div>
            {/* Visit frequency */}
            {avgVisitDays && (
              <div className="flex items-center justify-between text-xs pt-2 border-t">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" /> {t("visitFrequencyAvg")}
                </span>
                <span className="font-medium">{avgVisitDays} {t("days")}</span>
              </div>
            )}
            {/* Churn risk bar */}
            {churn.risk !== "none" && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className={cn("h-3.5 w-3.5", churn.risk === "high" ? "text-rose-500" : churn.risk === "medium" ? "text-amber-500" : "text-emerald-500")} />
                    {t("churnRisk")}
                  </span>
                  <span className={cn("font-bold", churn.risk === "high" ? "text-rose-600" : churn.risk === "medium" ? "text-amber-600" : "text-emerald-600")}>
                    {churnConfig.label} ({churn.score}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", churn.risk === "high" ? "bg-rose-500" : churn.risk === "medium" ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: `${churn.score}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
          {lastOrd && (
            <Card className="p-4">
              <p className="text-sm font-semibold mb-2">{t("lastPurchase")}</p>
              <p className="text-sm text-muted-foreground">
                {formatCartons(lastOrd.totalCartons)} {t("cartonsShort")} • {formatCurrency(lastOrd.totalAmount, lang)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(lastOrd.createdAt, lang)}</p>
            </Card>
          )}
          {/* Product affinity suggestions */}
          {affinitySuggestions.length > 0 && (
            <Card className="p-4 bg-gradient-to-br from-amber-50/50 to-transparent border-amber-300/30">
              <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> {t("productSuggestions")}
              </p>
              <p className="text-[11px] text-muted-foreground mb-2">{t("alsoBought")}</p>
              <div className="space-y-1.5">
                {affinitySuggestions.map((s) => (
                  <button
                    key={s.productId}
                    onClick={() => go("order", { customerId, returnTo: "customer" })}
                    className="w-full flex items-center justify-between text-sm p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors tap-scale"
                  >
                    <span className="truncate text-start">{s.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${s.affinityScore}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-end">{s.affinityScore}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Orders */}
        <TabsContent value="orders" className="px-4 mt-3 space-y-2">
          {cOrders.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="h-6 w-6" />} title={t("noOrders")} />
          ) : (
            cOrders.map((o) => {
              const hasDiscount = (o.promoDiscount ?? 0) > 0 || (o.segmentBonus ?? 0) > 0;
              const gross = o.grossAmount ?? o.totalAmount;
              return (
                <Card key={o.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{formatCartons(o.totalCartons)} {t("cartonsShort")}</p>
                      <div className="flex items-center gap-1.5">
                        {hasDiscount && gross > o.totalAmount && (
                          <span className="text-[11px] text-muted-foreground line-through">{formatCurrency(gross, lang)}</span>
                        )}
                        <p className="text-xs font-medium text-primary">{formatCurrency(o.totalAmount, lang)}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">{formatDate(o.createdAt, lang)}</p>
                      <p className="text-[11px] text-muted-foreground">{o.items?.length ?? 0} {t("product")}</p>
                    </div>
                  </div>
                  {/* Discount breakdown */}
                  {hasDiscount && (
                    <div className="mt-2 pt-2 border-t space-y-1">
                      {(o.promoDiscount ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Tag className="h-3 w-3" /> {t("promotion")}
                          </span>
                          <span className="text-emerald-600 font-medium">−{formatCurrency(o.promoDiscount ?? 0, lang)}</span>
                        </div>
                      )}
                      {(o.segmentBonus ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-violet-600 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> {o.segmentBonusLabel ?? t("intelligence")}
                          </span>
                          <span className="text-violet-600 font-medium">−{formatCurrency(o.segmentBonus ?? 0, lang)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {o.items && o.items.length > 0 && (
                    <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
                      {o.items.slice(0, 5).map((it) => {
                        const p = useDataStore.getState().products.find((x) => x.id === it.productId);
                        return (
                          <Badge key={it.id} variant="outline" className="text-[10px]">
                            {p?.name?.split(" ").slice(0, 2).join(" ")} ×{it.qty}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="px-4 mt-3 space-y-2">
          {cVisits.length === 0 ? (
            <EmptyState icon={<Clock className="h-6 w-6" />} title={t("noVisits")} />
          ) : (
            cVisits.map((v) => (
              <Card key={v.id} className="p-3">
                <div className="flex items-center gap-2">
                  <VisitResultDot result={v.result} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t(visitResultKey(v.result))}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(v.createdAt, lang)}</p>
                  </div>
                  {v.objection && (
                    <Badge variant="secondary" className="text-[10px]">{t(objectionKey(v.objection))}</Badge>
                  )}
                </div>
                {v.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{v.notes}"</p>}
              </Card>
            ))
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="px-4 mt-3 space-y-2">
          <Card className="p-3 space-y-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t("noteContent")}
              className="min-h-16 resize-none border-0 bg-muted/50"
            />
            <div className="flex gap-1.5">
              {(["CUSTOMER", "VISIT", "AREA", "PERSONAL"] as NoteType[]).map((nt) => (
                <button
                  key={nt}
                  onClick={() => setNoteType(nt)}
                  className={cn(
                    "flex-1 h-8 rounded-lg text-[11px] font-medium border transition-colors tap-scale",
                    noteType === nt ? "bg-primary text-primary-foreground border-primary" : "border-border"
                  )}
                >
                  {t(noteTypeKey(nt))}
                </button>
              ))}
            </div>
            <Button className="w-full" size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>
              <Plus className="h-4 w-4 me-1" /> {t("addNote")}
            </Button>
          </Card>
          {cNotes.length === 0 ? (
            <EmptyState icon={<StickyNote className="h-6 w-6" />} title={t("noNotes")} />
          ) : (
            cNotes.map((n) => (
              <Card key={n.id} className="p-3">
                <div className="flex items-start gap-2">
                  <StickyNote className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.content}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t(noteTypeKey(n.type))} • {formatDate(n.createdAt, lang)}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)} className="text-muted-foreground tap-scale p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Star; label: string; value: string; color: string }) {
  return (
    <Card className="p-3">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${color} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-base font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

function VisitResultDot({ result }: { result: string }) {
  const colors: Record<string, string> = {
    ORDER_CREATED: "bg-primary",
    FOLLOW_UP: "bg-amber-500",
    BUSY: "bg-zinc-400",
    ABSENT: "bg-orange-500",
    CLOSED: "bg-rose-500",
    INFO_COLLECTED: "bg-sky-500",
    NOT_INTERESTED: "bg-rose-600",
  };
  return <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 mt-1.5", colors[result] ?? "bg-muted")} />;
}

function visitResultKey(r: string): string {
  const map: Record<string, string> = {
    ORDER_CREATED: "orderCreated",
    FOLLOW_UP: "followUpNeeded",
    BUSY: "busy",
    ABSENT: "absent",
    CLOSED: "closed",
    INFO_COLLECTED: "infoCollected",
    NOT_INTERESTED: "notInterested",
  };
  return map[r] ?? r;
}

function objectionKey(o: string): string {
  const map: Record<string, string> = {
    EXPENSIVE: "expensive",
    HAS_STOCK: "hasStock",
    LOW_DEMAND: "lowDemand",
    USES_COMPETITOR: "usesCompetitor",
    NO_MONEY: "noMoney",
    OWNER_ABSENT: "ownerAbsent",
    SHOP_CLOSED: "shopClosed",
    OTHER: "other",
  };
  return map[o] ?? o;
}

function noteTypeKey(n: string): string {
  const map: Record<string, string> = {
    CUSTOMER: "customerNote",
    VISIT: "visitNote",
    AREA: "areaNote",
    PERSONAL: "personalNote",
  };
  return map[n] ?? n;
}
