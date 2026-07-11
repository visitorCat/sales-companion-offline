"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScheduledVisit { id: string; customerId: string; customerName: string; shopName: string; date: string; time?: string; note?: string; done: boolean; createdAt: string; }

interface ScheduledVisitsState {
  visits: ScheduledVisit[];
  schedule: (v: Omit<ScheduledVisit, "id" | "createdAt" | "done">) => Promise<string>;
  remove: (id: string) => Promise<void>;
  markDone: (id: string) => Promise<void>;
  forDate: (date: string) => ScheduledVisit[];
  forToday: () => ScheduledVisit[];
  forTomorrow: () => ScheduledVisit[];
  upcoming: () => ScheduledVisit[];
  hydrate: (visits: ScheduledVisit[]) => void;
}

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function tomorrowStr(): string { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }

export const useScheduledVisits = create<ScheduledVisitsState>()(
  persist(
    (set, get) => ({
      visits: [],
      hydrate: (visits) => set({ visits }),
      schedule: async (v) => {
        const { createScheduledVisit } = await import("@/lib/dexie-data");
        const sv = await createScheduledVisit({ customerId: v.customerId, repId: null, date: v.date, time: v.time ?? null, note: v.note ?? null });
        const visit: ScheduledVisit = { ...v, id: sv.id, createdAt: sv.createdAt, done: false };
        set((s) => ({ visits: [...s.visits, visit] }));
        return sv.id;
      },
      remove: async (id) => {
        set((s) => ({ visits: s.visits.filter((v) => v.id !== id) }));
        const { deleteScheduledVisit } = await import("@/lib/dexie-data");
        await deleteScheduledVisit(id);
      },
      markDone: async (id) => {
        set((s) => ({ visits: s.visits.map((v) => (v.id === id ? { ...v, done: true } : v)) }));
        const { updateScheduledVisit } = await import("@/lib/dexie-data");
        await updateScheduledVisit(id, { done: true });
      },
      forDate: (date) => get().visits.filter((v) => v.date === date && !v.done).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")),
      forToday: () => get().forDate(todayStr()),
      forTomorrow: () => get().forDate(tomorrowStr()),
      upcoming: () => { const today = todayStr(); return get().visits.filter((v) => v.date >= today && !v.done).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "")); },
    }),
    { name: "fsr-scheduled-visits-v1" }
  )
);
