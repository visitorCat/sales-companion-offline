import { db, uid, hashPin, verifyPin, type Rep, type Customer, type Order, type OrderItem, type Visit, type Note, type Product, type ScheduledVisit, type Delivery } from "./db-dexie";

export interface SyncData { rep: Rep | null; allReps: Rep[]; sectors: any[]; areas: any[]; categories: any[]; products: Product[]; customers: Customer[]; orders: Order[]; visits: Visit[]; notes: Note[]; promotions: any[]; objective: any; scheduledVisits: any[]; deliveries: any[]; prefs: Record<string, any[]>; }

export async function loadAllData(repId?: string): Promise<SyncData> {
  const [reps, sectors, areas, categories, products, allCust, allOrd, visits, notes, promos, objs, sVisits, dels, prefs] = await Promise.all([
    db.reps.toArray(), db.sectors.toArray(), db.areas.toArray(), db.categories.toArray(), db.products.toArray(),
    db.customers.toArray(), db.orders.toArray(), db.visits.toArray(), db.notes.toArray(),
    db.promotions.toArray(), db.objectives.toArray(), db.scheduledVisits.filter(v=>!v.done).toArray(), db.deliveries.toArray(), db.prefs.toArray(),
  ]);
  const customers = repId ? allCust.filter(c=>c.repId===repId) : allCust;
  const cIds = new Set(customers.map(c=>c.id));
  const orders = repId ? allOrd.filter(o=>o.repId===repId||cIds.has(o.customerId)) : allOrd;
  const rep = repId ? reps.find(r=>r.id===repId) ?? null : reps[0] ?? null;
  const month = new Date().toISOString().slice(0,7);
  const objective = rep ? objs.find(o=>o.repId===rep.id&&o.month===month) ?? null : null;
  const pm: Record<string, any[]> = {}; for (const p of prefs) { if(!pm[p.customerId]) pm[p.customerId]=[]; pm[p.customerId].push(p); }
  const deliveries = dels.map(d => { const o = allOrd.find(x=>x.id===d.orderId); const c = o?allCust.find(x=>x.id===o.customerId):null; return { ...d, customerName: c?.shopName??"—", customerPhone: c?.phone??"", totalCartons: o?.totalCartons??0, totalAmount: o?.totalAmount??0 }; });
  const activePromos = promos.filter((p:any)=>p.active);
  return { rep, allReps: reps, sectors, areas, categories, products: products.sort((a,b)=>a.order-b.order), customers: customers.sort((a,b)=>a.visitOrder-b.visitOrder), orders: orders.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)), visits: visits.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)), notes: notes.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)), promotions: activePromos, objective, scheduledVisits: sVisits, deliveries, prefs: pm };
}

export async function loginWithEmailPassword(email: string, password: string): Promise<Rep | null> {
  const rep = await db.reps.where("email").equals(email.toLowerCase().trim()).first();
  if (!rep || rep.password !== password) return null;
  return rep;
}

export async function registerRep(data: { name: string; email: string; password: string; phone: string; monthlyTargetCartons: number; }): Promise<Rep> {
  const existing = await db.reps.where("email").equals(data.email.toLowerCase().trim()).first();
  if (existing) throw new Error("Email already registered");
  const rep: Rep = { id: uid("rep_"), name: data.name, email: data.email.toLowerCase().trim(), password: data.password, phone: data.phone, pinHash: await hashPin(data.password.slice(0,4)), monthlyTargetCartons: data.monthlyTargetCartons, createdAt: new Date().toISOString() };
  await db.reps.add(rep);
  await db.objectives.add({ id: uid("obj_"), repId: rep.id, month: new Date().toISOString().slice(0,7), targetCartons: data.monthlyTargetCartons });
  return rep;
}

export async function createOrder(data: { customerId: string; repId: string; items: { productId: string; qty: number; unitPrice: number }[]; grossAmount: number; promoDiscount: number; segmentBonus: number; segmentBonusLabel: string | null; }): Promise<Order> {
  let tc = 0, ta = 0; const items: OrderItem[] = data.items.map(it => { const sub = it.qty*it.unitPrice; tc+=it.qty; ta+=sub; return { id: uid("oi_"), orderId: "", productId: it.productId, qty: it.qty, unitPrice: it.unitPrice, subtotal: sub }; });
  const order: Order = { id: uid("order_"), customerId: data.customerId, repId: data.repId, totalCartons: tc, totalAmount: ta, grossAmount: data.grossAmount||ta, promoDiscount: data.promoDiscount, segmentBonus: data.segmentBonus, segmentBonusLabel: data.segmentBonusLabel, status: "CONFIRMED", note: null, createdAt: new Date().toISOString(), items };
  items.forEach(it => it.orderId = order.id);
  await db.orders.add(order);
  await db.customers.update(data.customerId, { lastOrderAt: order.createdAt });
  for (const it of data.items) { const ex = await db.prefs.where("customerId").equals(data.customerId).toArray(); const pr = ex.find(p=>p.productId===it.productId); if (pr) await db.prefs.update(pr.id, { timesOrdered: pr.timesOrdered+1, lastOrderedAt: order.createdAt }); else await db.prefs.add({ id: uid("pref_"), customerId: data.customerId, productId: it.productId, timesOrdered: 1, lastOrderedAt: order.createdAt }); }
  return order;
}

export async function createVisit(data: { customerId: string; repId: string; result: string; objection: string | null; notes: string | null; durationSec: number; }): Promise<Visit> {
  const visit: Visit = { id: uid("visit_"), customerId: data.customerId, repId: data.repId, result: data.result, objection: data.objection, notes: data.notes, durationSec: data.durationSec, createdAt: new Date().toISOString() };
  await db.visits.add(visit);
  await db.customers.update(data.customerId, { lastVisitAt: visit.createdAt });
  return visit;
}

export async function createCustomer(data: any): Promise<Customer> {
  const c: Customer = { ...data, id: uid("cust_"), lastVisitAt: null, lastOrderAt: null, active: true };
  await db.customers.add(c);
  return c;
}

export async function deleteCustomer(id: string): Promise<void> { await db.customers.delete(id); await db.orders.where("customerId").equals(id).delete(); await db.visits.where("customerId").equals(id).delete(); await db.notes.where("customerId").equals(id).delete(); await db.scheduledVisits.where("customerId").equals(id).delete(); }

export async function createProduct(data: any): Promise<Product> { const count = await db.products.count(); const p: Product = { ...data, id: uid("prod_"), order: count }; await db.products.add(p); return p; }
export async function updateProduct(id: string, data: any): Promise<void> { await db.products.update(id, data); }
export async function deleteProduct(id: string): Promise<void> { await db.products.delete(id); }
export async function createNote(data: any): Promise<Note> { const n: Note = { id: uid("note_"), ...data, createdAt: new Date().toISOString() }; await db.notes.add(n); return n; }
export async function deleteNote(id: string): Promise<void> { await db.notes.delete(id); }
export async function createScheduledVisit(data: any): Promise<ScheduledVisit> { const sv: ScheduledVisit = { id: uid("sv_"), ...data, done: false, createdAt: new Date().toISOString() }; await db.scheduledVisits.add(sv); return sv; }
export async function updateScheduledVisit(id: string, data: any): Promise<void> { await db.scheduledVisits.update(id, data); }
export async function deleteScheduledVisit(id: string): Promise<void> { await db.scheduledVisits.delete(id); }
export async function createDelivery(data: any): Promise<Delivery> { const d: Delivery = { id: uid("del_"), orderId: data.orderId, status: "PENDING", driverName: data.driverName??null, driverPhone: data.driverPhone??null, notes: data.notes??null, deliveredAt: null, createdAt: new Date().toISOString() }; await db.deliveries.add(d); return d; }
export async function updateDelivery(id: string, data: any): Promise<void> { const u: any = { ...data }; if (data.status === "DELIVERED" && !data.deliveredAt) u.deliveredAt = new Date().toISOString(); await db.deliveries.update(id, u); }
