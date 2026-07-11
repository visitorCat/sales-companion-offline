"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AreaT, CustomerT, NoteT, ObjectiveT, OrderT, ProductCategoryT,
  ProductT, RepT, SectorT, VisitT, CustomerPrefT, PromotionT, DeliveryT,
} from "@/lib/types";

export interface DataState {
  rep: RepT | null;
  allReps: RepT[];
  sectors: SectorT[];
  areas: AreaT[];
  categories: ProductCategoryT[];
  products: ProductT[];
  customers: CustomerT[];
  orders: OrderT[];
  visits: VisitT[];
  notes: NoteT[];
  objective: ObjectiveT | null;
  prefs: Record<string, CustomerPrefT[]>;
  promotions: PromotionT[];
  deliveries: DeliveryT[];
  lastSyncedAt: string | null;
  hydrated: boolean;

  hydrate: (data: Partial<DataState>) => void;
  setRep: (rep: RepT) => void;
  setObjective: (o: ObjectiveT) => void;

  upsertCustomer: (c: CustomerT) => void;
  removeCustomer: (id: string) => void;

  addOrder: (o: OrderT) => void;

  addVisit: (v: VisitT) => void;

  addNote: (n: NoteT) => void;
  removeNote: (id: string) => void;

  setCustomerPrefs: (customerId: string, prefs: CustomerPrefT[]) => void;
  upsertProduct: (p: ProductT) => void;

  markSynced: () => void;
  reset: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      rep: null,
      allReps: [],
      sectors: [],
      areas: [],
      categories: [],
      products: [],
      customers: [],
      orders: [],
      visits: [],
      notes: [],
      objective: null,
      prefs: {},
      promotions: [],
      deliveries: [],
      lastSyncedAt: null,
      hydrated: false,

      hydrate: (data) =>
        set((s) => ({
          ...s,
          ...data,
          hydrated: true,
          lastSyncedAt: new Date().toISOString(),
        })),
      setRep: (rep) => set({ rep }),
      setObjective: (objective) => set({ objective }),

      upsertCustomer: (c) =>
        set((s) => {
          const exists = s.customers.some((x) => x.id === c.id);
          return {
            customers: exists
              ? s.customers.map((x) => (x.id === c.id ? c : x))
              : [c, ...s.customers],
          };
        }),
      removeCustomer: (id) =>
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),

      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),

      addVisit: (v) => set((s) => ({ visits: [v, ...s.visits] })),

      addNote: (n) => set((s) => ({ notes: [n, ...s.notes] })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

      setCustomerPrefs: (customerId, prefs) =>
        set((s) => ({ prefs: { ...s.prefs, [customerId]: prefs } })),

      upsertProduct: (p) =>
        set((s) => {
          const exists = s.products.some((x) => x.id === p.id);
          return {
            products: exists
              ? s.products.map((x) => (x.id === p.id ? p : x))
              : [p, ...s.products],
          };
        }),

      markSynced: () => set({ lastSyncedAt: new Date().toISOString() }),
      reset: () =>
        set({
          rep: null,
      allReps: [], sectors: [], areas: [], categories: [], products: [],
          customers: [], orders: [], visits: [], notes: [], objective: null,
          prefs: {}, promotions: [], deliveries: [], lastSyncedAt: null, hydrated: false,
        }),
    }),
    {
      name: "fsr-data-v1",
      partialize: (s) => ({
        rep: s.rep,
        allReps: s.allReps,
        sectors: s.sectors,
        areas: s.areas,
        categories: s.categories,
        products: s.products,
        customers: s.customers,
        orders: s.orders,
        visits: s.visits,
        notes: s.notes,
        objective: s.objective,
        prefs: s.prefs,
        promotions: s.promotions,
        deliveries: s.deliveries,
        lastSyncedAt: s.lastSyncedAt,
      }),
    }
  )
);
