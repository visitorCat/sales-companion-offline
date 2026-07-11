"use client";

import { useState } from "react";
import { useScheduledVisits, type ScheduledVisit } from "@/store/scheduled-visits";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, CalendarPlus, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function ScheduleVisitDialog({
  open, onOpenChange, customerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string;
}) {
  const t = useT();
  const { customers } = useDataStore();
  const schedule = useScheduledVisits((s) => s.schedule);
  const customer = customers.find((c) => c.id === customerId);

  // fresh state each time the dialog opens (key trick via open-dependent initializer)
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  function handleClose(v: boolean) {
    if (!v) {
      // reset on close
      setDate(todayStr());
      setTime("");
      setNote("");
    }
    onOpenChange(v);
  }

  async function handleSchedule() {
    if (!customer) return;
    await schedule({
      customerId: customer.id,
      customerName: customer.owner,
      shopName: customer.shopName,
      date,
      time: time || undefined,
      note: note || undefined,
    });
    toast.success(t("scheduleVisit") + " ✓");
    handleClose(false);
  }

  const quickDates = [
    { label: t("today1"), value: todayStr() },
    { label: t("tomorrow"), value: tomorrowStr() },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            {t("scheduleVisit")}
          </DialogTitle>
        </DialogHeader>
        {customer && (
          <p className="text-sm text-muted-foreground -mt-2">{customer.shopName}</p>
        )}

        <div className="space-y-4">
          {/* Quick date buttons */}
          <div>
            <Label className="mb-2 block">{t("visitDate")}</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {quickDates.map((qd) => (
                <button
                  key={qd.value}
                  onClick={() => setDate(qd.value)}
                  className={cn(
                    "h-10 rounded-xl text-sm font-medium border-2 transition-colors tap-scale",
                    date === qd.value ? "border-primary bg-primary/5 text-primary" : "border-border"
                  )}
                >
                  {qd.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 ps-9 rounded-xl"
              />
            </div>
          </div>

          {/* Time */}
          <div>
            <Label className="mb-2 block">{t("visitDate")} ({t("optional")})</Label>
            <div className="relative">
              <Clock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 ps-9 rounded-xl"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <Label className="mb-2 block">{t("noteContent")} ({t("optional")})</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("noteContent")}
              className="min-h-16 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
            {t("cancel")}
          </Button>
          <Button className="flex-1" onClick={handleSchedule} disabled={!date}>
            <CalendarPlus className="h-4 w-4 me-1" /> {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ScheduledVisitCard({
  visit, onOpen, onDone, onRemove,
}: {
  visit: ScheduledVisit;
  onOpen: () => void;
  onDone: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const dateLabel = (() => {
    const today = todayStr();
    const tomorrow = tomorrowStr();
    if (visit.date === today) return t("today1");
    if (visit.date === tomorrow) return t("tomorrow");
    return new Date(visit.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  })();

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border tap-scale">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <Calendar className="h-5 w-5" />
      </div>
      <button onClick={onOpen} className="flex-1 min-w-0 text-start">
        <p className="text-sm font-medium truncate">{visit.shopName}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{dateLabel}</span>
          {visit.time && (
            <>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{visit.time}</span>
            </>
          )}
        </p>
        {visit.note && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{visit.note}</p>}
      </button>
      <button
        onClick={onDone}
        className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-600 grid place-items-center tap-scale shrink-0"
        aria-label={t("done")}
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={onRemove}
        className="h-8 w-8 rounded-lg bg-muted text-muted-foreground grid place-items-center tap-scale shrink-0"
        aria-label={t("delete")}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
