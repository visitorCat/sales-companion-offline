import Dexie, { type Table } from "dexie";

export interface Rep { id: string; name: string; email: string; password: string; phone: string; pinHash: string; monthlyTargetCartons: number; createdAt: string; }
export interface Sector { id: string; code: string; name: string; order: number; }
export interface Area { id: string; sectorId: string; name: string; order: number; }
export interface ProductCategory { id: string; name: string; order: number; }
export interface Product { id: string; name: string; sku: string | null; barcode: string | null; categoryId: string; sellingPrice: number; packageSize: number; cartonsPerCase: number; availability: "AVAILABLE" | "LOW" | "OUT"; imageUrl: string | null; description: string | null; isFavorite: boolean; order: number; }
export interface Customer { id: string; shopName: string; owner: string; phone: string; type: string; sectorId: string; areaId: string; repId: string | null; rating: "A" | "B" | "C"; lat: number | null; lng: number | null; address: string | null; lastVisitAt: string | null; lastOrderAt: string | null; visitOrder: number; active: boolean; }
export interface OrderItem { id: string; orderId: string; productId: string; qty: number; unitPrice: number; subtotal: number; }
export interface Order { id: string; customerId: string; repId: string; totalCartons: number; totalAmount: number; grossAmount: number; promoDiscount: number; segmentBonus: number; segmentBonusLabel: string | null; status: string; note: string | null; createdAt: string; items: OrderItem[]; }
export interface Visit { id: string; customerId: string; repId: string; result: string; objection: string | null; notes: string | null; durationSec: number; createdAt: string; }
export interface Note { id: string; customerId: string | null; areaId: string | null; type: string; content: string; createdAt: string; }
export interface Promotion { id: string; name: string; type: string; productId: string; value: number; threshold: number; startDate: string; endDate: string; active: boolean; }
export interface Objective { id: string; repId: string; month: string; targetCartons: number; }
export interface ScheduledVisit { id: string; customerId: string; repId: string | null; date: string; time: string | null; note: string | null; done: boolean; createdAt: string; }
export interface Delivery { id: string; orderId: string; status: string; driverName: string | null; driverPhone: string | null; notes: string | null; deliveredAt: string | null; createdAt: string; }
export interface CustomerProductPref { id: string; customerId: string; productId: string; timesOrdered: number; lastOrderedAt: string | null; }
export interface RoutePlan { id: string; day: string; sectorId: string; areaIds: string[]; order: number; }

class SalesDB extends Dexie {
  reps!: Table<Rep, string>; sectors!: Table<Sector, string>; areas!: Table<Area, string>;
  categories!: Table<ProductCategory, string>; products!: Table<Product, string>;
  customers!: Table<Customer, string>; orders!: Table<Order, string>; visits!: Table<Visit, string>;
  notes!: Table<Note, string>; promotions!: Table<Promotion, string>;
  objectives!: Table<Objective, string>; scheduledVisits!: Table<ScheduledVisit, string>;
  deliveries!: Table<Delivery, string>; prefs!: Table<CustomerProductPref, string>;
  routePlans!: Table<RoutePlan, string>;
  constructor() {
    super("SalesCompanionDB");
    this.version(1).stores({
      reps: "id, email", sectors: "id, code", areas: "id, sectorId",
      categories: "id, name", products: "id, name, sku, barcode, categoryId, availability",
      customers: "id, sectorId, areaId, repId, rating, active",
      orders: "id, customerId, repId, createdAt", visits: "id, customerId, repId, createdAt",
      notes: "id, customerId, type, createdAt", promotions: "id, productId, active",
      objectives: "id, repId, month", scheduledVisits: "id, customerId, date, done",
      deliveries: "id, orderId, status", prefs: "id, customerId, productId",
    });
    // v2: add routePlans table for Route Planning editor (days/sectors/areas)
    this.version(2).stores({
      routePlans: "id, day, sectorId, order",
    });
  }
}
export const db = new SalesDB();
export function uid(prefix = ""): string { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
export async function hashPin(pin: string): Promise<string> { const enc = new TextEncoder().encode("fsr::" + pin); const buf = await crypto.subtle.digest("SHA-256", enc); return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
export async function verifyPin(pin: string, hash: string): Promise<boolean> { return (await hashPin(pin)) === hash; }
