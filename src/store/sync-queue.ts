"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SyncJob {
  id: string;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  body: unknown;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  // optimistic local refs to clean up if permanently failed
  localId?: string;
  kind: "order" | "visit" | "customer" | "note" | "delete-customer" | "delete-note";
}

interface SyncQueueState {
  queue: SyncJob[];
  processing: boolean;
  lastProcessedAt: string | null;
  enqueue: (job: Omit<SyncJob, "id" | "createdAt" | "attempts" | "lastError">) => string;
  remove: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  incrementAttempt: (id: string) => void;
  setProcessing: (v: boolean) => void;
  clear: () => void;
  setLastProcessed: (iso: string) => void;
}

export const useSyncQueue = create<SyncQueueState>()(
  persist(
    (set) => ({
      queue: [],
      processing: false,
      lastProcessedAt: null,
      enqueue: (job) => {
        const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((s) => ({
          queue: [...s.queue, { ...job, id, createdAt: new Date().toISOString(), attempts: 0, lastError: null }],
        }));
        return id;
      },
      remove: (id) => set((s) => ({ queue: s.queue.filter((j) => j.id !== id) })),
      markFailed: (id, error) =>
        set((s) => ({ queue: s.queue.map((j) => (j.id === id ? { ...j, lastError: error } : j)) })),
      incrementAttempt: (id) =>
        set((s) => ({ queue: s.queue.map((j) => (j.id === id ? { ...j, attempts: j.attempts + 1 } : j)) })),
      setProcessing: (v) => set({ processing: v }),
      clear: () => set({ queue: [] }),
      setLastProcessed: (iso) => set({ lastProcessedAt: iso }),
    }),
    { name: "fsr-sync-queue-v1" }
  )
);

// Background processor — call when online
export async function processQueue() {
  const store = useSyncQueue.getState();
  if (store.processing || store.queue.length === 0) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  store.setProcessing(true);
  const jobs = [...store.queue];

  for (const job of jobs) {
    try {
      const res = await fetch(job.url, {
        method: job.method,
        headers: { "Content-Type": "application/json" },
        body: job.method === "DELETE" ? undefined : JSON.stringify(job.body),
      });
      if (res.ok || res.status === 404) {
        store.remove(job.id);
      } else {
        store.incrementAttempt(job.id);
        store.markFailed(job.id, `HTTP ${res.status}`);
        // give up after 5 attempts
        if (job.attempts >= 5) {
          store.remove(job.id);
        }
      }
    } catch (e: any) {
      store.incrementAttempt(job.id);
      store.markFailed(job.id, e?.message ?? "network error");
      if (job.attempts >= 5) store.remove(job.id);
      break; // stop processing on network error
    }
  }

  store.setProcessing(false);
  store.setLastProcessed(new Date().toISOString());
}
