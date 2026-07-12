"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { ScreenHeader } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, RefreshCw, Clock, UserX, Lock, Info, ThumbsDown,
  Check, Loader2, Package, ChevronRight, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { VisitResult, ObjectionReason } from "@/lib/types";

const results: { v: VisitResult; key: string; icon: typeof ShoppingBag; color: string }[] = [
  { v: "ORDER_CREATED", key: "orderCreated", icon: ShoppingBag, color: "bg-primary text-primary-foreground" },
  { v: "FOLLOW_UP", key: "followUpNeeded", icon: RefreshCw, color: "bg-amber-500 text-white" },
  { v: "BUSY", key: "busy", icon: Clock, color: "bg-zinc-400 text-white" },
  { v: "ABSENT", key: "absent", icon: UserX, color: "bg-orange-500 text-white" },
  { v: "CLOSED", key: "closed", icon: Lock, color: "bg-rose-500 text-white" },
  { v: "INFO_COLLECTED", key: "infoCollected", icon: Info, color: "bg-sky-500 text-white" },
  { v: "NOT_INTERESTED", key: "notInterested", icon: ThumbsDown, color: "bg-rose-600 text-white" },
];

const objections: { v: ObjectionReason; key: string }[] = [
  { v: "EXPENSIVE", key: "expensive" },
  { v: "HAS_STOCK", key: "hasStock" },
  { v: "LOW_DEMAND", key: "lowDemand" },
  { v: "USES_COMPETITOR", key: "usesCompetitor" },
  { v: "NO_MONEY", key: "noMoney" },
  { v: "OWNER_ABSENT", key: "ownerAbsent" },
  { v: "SHOP_CLOSED", key: "shopClosed" },
  { v: "OTHER", key: "other" },
];

const needsObjection = (r: VisitResult) =>
  r === "NOT_INTERESTED" || r === "FOLLOW_UP" || r === "ABSENT" || r === "CLOSED" || r === "BUSY";

export function VisitScreen() {
  const t = useT();
  const params = useAppStore((s) => s.params);
  const back = useAppStore((s) => s.back);
  const go = useAppStore((s) => s.go);
  const route = useAppStore((s) => s.route);
  const nextInRoute = useAppStore((s) => s.nextInRoute);
  const { customers, addVisit, upsertCustomer, rep } = useDataStore();

  const customerId = params.customerId as string;
  const customer = customers.find((c) => c.id === customerId);
  const orderDone = (params.orderDone as boolean) ?? false;

  const [step, setStep] = useState<"result" | "details">("result");
  const [result, setResult] = useState<VisitResult | null>(null);
  const [objection, setObjection] = useState<ObjectionReason | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const inRoute = route.startedAt !== null && route.customerIds[route.index] === customerId;

  if (!customer) {
    return (
      <div>
        <ScreenHeader title={t("newVisit")} />
        <div className="p-8 text-center text-muted-foreground">{t("noCustomers")}</div>
      </div>
    );
  }

  function pickResult(r: VisitResult) {
    setResult(r);
    setStep("details");
  }

  // Navigate to order screen WITHOUT saving visit yet
  function goToOrder() {
    go("order", { customerId, returnTo: "visit", fromVisit: true });
  }

  // Save visit and move to next customer
  async function finishVisit() {
    if (!result || !customer) return;
    if (needsObjection(result) && !objection) {
      toast.error(t("objectionReason"));
      return;
    }
    setSaving(true);
    const tempId = `local-${Date.now()}`;
    const visit = {
      id: tempId,
      customerId,
      repId: rep?.id ?? "local",
      result,
      objection: needsObjection(result) ? objection : null,
      notes: notes.trim() || null,
      durationSec: 0,
      createdAt: new Date().toISOString(),
    };
    addVisit(visit);
    upsertCustomer({ ...customer, lastVisitAt: visit.createdAt });
    try {
      const { createVisit } = await import("@/lib/dexie-data");
      const created = await createVisit({ customerId, repId: rep?.id ?? "local", result, objection: visit.objection, notes: visit.notes, durationSec: 0 });
      const ds = useDataStore.getState();
      useDataStore.setState({ visits: ds.visits.map((v) => (v.id === tempId ? created : v)) });
    } catch { /* keep local */ }
    setSaving(false);
    toast.success(t("visitSaved"));

    if (inRoute) {
      nextInRoute();
      go("route", {});
    } else {
      back();
    }
  }

  return (
    <div className="min-h-dynamic flex flex-col">
      <ScreenHeader title={t("newVisit")} subtitle={customer.shopName} />

      {/* Steps indicator */}
      <div className="px-4 pt-3 flex items-center gap-2">
        <StepDot n={1} active={step === "result" && !orderDone} done={step === "details" || orderDone} label={t("visitResult")} />
        <div className={cn("h-0.5 flex-1 rounded", step === "details" || orderDone ? "bg-primary" : "bg-muted")} />
        <StepDot n={2} active={step === "details" && !orderDone} done={orderDone} label={t("notes")} />
      </div>

      {step === "result" && !orderDone && (
        <div className="flex-1 px-4 pt-4 space-y-2">
          <p className="text-sm font-semibold text-muted-foreground mb-2">{t("visitResult")}</p>
          {results.map((r) => {
            const Icon = r.icon;
            return (
              <motion.button
                key={r.v}
                whileTap={{ scale: 0.98 }}
                onClick={() => pickResult(r.v)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors tap-scale text-start",
                  result === r.v ? "border-primary bg-primary/5" : "border-border bg-card"
                )}
              >
                <span className={cn("h-11 w-11 rounded-xl grid place-items-center shrink-0", r.color)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 font-medium">{t(r.key)}</span>
                {result === r.v && <Check className="h-5 w-5 text-primary" />}
              </motion.button>
            );
          })}
        </div>
      )}

      {step === "details" && !orderDone && (
        <div className="flex-1 px-4 pt-4 space-y-4">
          {/* Selected result */}
          <Card className="p-3 flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{result && t(results.find((r) => r.v === result)!.key)}</span>
            <Button variant="ghost" size="sm" className="ms-auto" onClick={() => setStep("result")}>
              {t("edit")}
            </Button>
          </Card>

          {/* Objection */}
          {result && needsObjection(result) && (
            <div>
              <p className="text-sm font-semibold mb-2">{t("objectionReason")} *</p>
              <div className="grid grid-cols-2 gap-2">
                {objections.map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setObjection(o.v)}
                    className={cn(
                      "h-11 rounded-xl text-sm font-medium border-2 transition-colors tap-scale",
                      objection === o.v ? "border-primary bg-primary/5 text-primary" : "border-border"
                    )}
                  >
                    {t(o.key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-sm font-semibold mb-2">{t("visitNotes")} <span className="text-muted-foreground font-normal">({t("optional")})</span></p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("visitNotes")}
              className="min-h-24 resize-none"
            />
          </div>

          {/* Create Order button — replaces the old "order created" CTA */}
          {result === "ORDER_CREATED" && (
            <Card className="p-4 bg-primary/5 border-primary/30">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t("createOrder")}</p>
                  <p className="text-xs text-muted-foreground">{t("quickOrder")}</p>
                </div>
                <Button size="sm" onClick={goToOrder}>
                  <ShoppingBag className="h-4 w-4 me-1" /> {t("createOrder")}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* After order is done — show End Visit + Next Customer */}
      {orderDone && (
        <div className="flex-1 px-4 pt-4 space-y-4">
          <Card className="p-6 text-center bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-500/30">
            <Check className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
            <p className="text-base font-semibold">{t("orderConfirmed")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("finishVisit")}</p>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-3 pb-safe space-y-2">
        {orderDone ? (
          // After order: End Visit + Next Customer
          <Button
            className="w-full h-12 rounded-xl font-semibold tap-scale"
            disabled={saving}
            onClick={finishVisit}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 me-1" />}
            {t("finishVisit")}
            {inRoute && <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />}
          </Button>
        ) : step === "result" ? (
          <Button
            className="w-full h-12 rounded-xl font-semibold tap-scale"
            disabled={!result}
            onClick={() => setStep("details")}
          >
            {t("next")} <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
          </Button>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-12 rounded-xl tap-scale" onClick={() => back()}>
                {t("cancel")}
              </Button>
              <Button
                className="flex-[2] h-12 rounded-xl font-semibold tap-scale"
                disabled={saving || (needsObjection(result!) && !objection)}
                onClick={finishVisit}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 me-1" />}
                {t("finishVisit")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "h-7 w-7 rounded-full grid place-items-center text-xs font-bold transition-colors",
        done ? "bg-primary text-primary-foreground" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <span className={cn("text-xs", active ? "font-medium" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}
