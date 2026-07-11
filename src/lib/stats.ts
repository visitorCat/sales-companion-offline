import type { CustomerT, OrderT, VisitT, ObjectiveT } from "@/lib/types";
import { startOfDay, endOfDay, weekStart, monthKey, isSameDay } from "@/lib/format";

export interface ComputedStats {
  todayCartons: number;
  weekCartons: number;
  monthCartons: number;
  target: number;
  remainingCartons: number;
  avgNeededPerDay: number;
  completion: number;
  daysLeftInMonth: number;
  visitedTodayIds: Set<string>;
  orderedTodayIds: Set<string>;
  dayVisits: VisitT[];
  dayOrders: OrderT[];
  remainingCustomers: number;
  successRate: number;
  skipped: number;
}

export function computeStats(
  orders: OrderT[],
  visits: VisitT[],
  customers: CustomerT[],
  objective: ObjectiveT | null,
  repTarget: number,
  now: Date = new Date()
): ComputedStats {
  const dStart = startOfDay(now);
  const dEnd = endOfDay(now);
  const wStart = startOfDay(weekStart(now));
  const month = monthKey(now);

  const dayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d >= dStart && d <= dEnd;
  });
  const weekOrders = orders.filter((o) => new Date(o.createdAt) >= wStart);
  const monthOrders = orders.filter((o) => o.createdAt.slice(0, 7) === month);
  const dayVisits = visits.filter((v) => {
    const d = new Date(v.createdAt);
    return d >= dStart && d <= dEnd;
  });

  const todayCartons = dayOrders.reduce((s, o) => s + o.totalCartons, 0);
  const weekCartons = weekOrders.reduce((s, o) => s + o.totalCartons, 0);
  const monthCartons = monthOrders.reduce((s, o) => s + o.totalCartons, 0);

  const target = objective?.targetCartons ?? repTarget;
  const remainingCartons = Math.max(0, target - monthCartons);

  const visitedTodayIds = new Set(dayVisits.map((v) => v.customerId));
  const orderedTodayIds = new Set(dayOrders.map((o) => o.customerId));
  const remainingCustomers = customers.filter(
    (c) => !visitedTodayIds.has(c.id) && c.active
  ).length;

  const daysLeftInMonth = (() => {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, end - now.getDate() + 1);
  })();
  const avgNeededPerDay = remainingCartons / daysLeftInMonth;
  const completion = target > 0 ? Math.min(100, Math.round((monthCartons / target) * 100)) : 0;
  const successRate = dayVisits.length > 0
    ? Math.round((dayVisits.filter((v) => v.result === "ORDER_CREATED").length / dayVisits.length) * 100)
    : 0;

  return {
    todayCartons: Math.round(todayCartons * 10) / 10,
    weekCartons: Math.round(weekCartons * 10) / 10,
    monthCartons: Math.round(monthCartons * 10) / 10,
    target,
    remainingCartons: Math.round(remainingCartons * 10) / 10,
    avgNeededPerDay: Math.round(avgNeededPerDay * 10) / 10,
    completion,
    daysLeftInMonth,
    visitedTodayIds,
    orderedTodayIds,
    dayVisits,
    dayOrders,
    remainingCustomers,
    successRate,
    skipped: 0,
  };
}

export function customerStatus(
  c: CustomerT,
  stats: ComputedStats
): "visited" | "ordered" | "followup" | "notVisited" {
  if (stats.orderedTodayIds.has(c.id)) return "ordered";
  if (stats.visitedTodayIds.has(c.id)) return "visited";
  return "notVisited";
}

export function lastVisitOf(customerId: string, visits: VisitT[]): VisitT | null {
  for (const v of visits) if (v.customerId === customerId) return v;
  return null;
}

export function lastOrderOf(customerId: string, orders: OrderT[]): OrderT | null {
  for (const o of orders) if (o.customerId === customerId) return o;
  return null;
}

export function avgOrderOf(customerId: string, orders: OrderT[]): number {
  const co = orders.filter((o) => o.customerId === customerId);
  if (co.length === 0) return 0;
  return co.reduce((s, o) => s + o.totalAmount, 0) / co.length;
}

export function customerOrders(customerId: string, orders: OrderT[]): OrderT[] {
  return orders.filter((o) => o.customerId === customerId);
}

export function customerVisits(customerId: string, visits: VisitT[]): VisitT[] {
  return visits.filter((v) => v.customerId === customerId);
}

/**
 * Customer intelligence: estimated next purchase date.
 * Based on average interval between orders. If the customer has < 2 orders, returns null.
 * Returns { avgDays, lastOrderDate, estimatedNext, daysOverdue, status }
 *  - status: "due" | "overdue" | "notdue" | "unknown"
 */
export function estimateNextPurchase(
  customerId: string,
  orders: OrderT[]
): {
  avgDays: number | null;
  lastOrderDate: Date | null;
  estimatedNext: Date | null;
  daysOverdue: number;
  status: "due" | "overdue" | "notdue" | "unknown";
} {
  const co = orders
    .filter((o) => o.customerId === customerId)
    .map((o) => new Date(o.createdAt))
    .sort((a, b) => a.getTime() - b.getTime());

  if (co.length < 2) {
    return {
      avgDays: null,
      lastOrderDate: co[0] ?? null,
      estimatedNext: null,
      daysOverdue: 0,
      status: "unknown",
    };
  }

  const intervals: number[] = [];
  for (let i = 1; i < co.length; i++) {
    intervals.push(co[i].getTime() - co[i - 1].getTime());
  }
  const avgMs = intervals.reduce((s, x) => s + x, 0) / intervals.length;
  const avgDays = Math.round(avgMs / 86400000);
  const lastOrderDate = co[co.length - 1];
  const estimatedNext = new Date(lastOrderDate.getTime() + avgMs);
  const now = new Date();
  const diffMs = now.getTime() - estimatedNext.getTime();
  const daysOverdue = Math.round(diffMs / 86400000);

  let status: "due" | "overdue" | "notdue" | "unknown";
  if (daysOverdue >= 3) status = "overdue";
  else if (daysOverdue >= -2) status = "due";
  else status = "notdue";

  return { avgDays, lastOrderDate, estimatedNext, daysOverdue, status };
}

/**
 * Visit frequency: average days between visits.
 */
export function visitFrequency(customerId: string, visits: VisitT[]): number | null {
  const cv = visits
    .filter((v) => v.customerId === customerId)
    .map((v) => new Date(v.createdAt))
    .sort((a, b) => a.getTime() - b.getTime());
  if (cv.length < 2) return null;
  const intervals: number[] = [];
  for (let i = 1; i < cv.length; i++) {
    intervals.push(cv[i].getTime() - cv[i - 1].getTime());
  }
  return Math.round(intervals.reduce((s, x) => s + x, 0) / intervals.length / 86400000);
}

/**
 * Customer churn risk: based on days since last order vs avg interval.
 * Returns { risk: "high" | "medium" | "low" | "none", daysSinceLastOrder, score }
 */
export function churnRisk(
  customerId: string,
  orders: OrderT[]
): { risk: "high" | "medium" | "low" | "none"; daysSinceLastOrder: number; score: number } {
  const est = estimateNextPurchase(customerId, orders);
  if (est.status === "unknown") {
    // new customer with < 2 orders — check if last order was > 30 days ago
    if (est.lastOrderDate) {
      const days = Math.round((Date.now() - est.lastOrderDate.getTime()) / 86400000);
      if (days > 30) return { risk: "medium", daysSinceLastOrder: days, score: 50 };
    }
    return { risk: "none", daysSinceLastOrder: 0, score: 0 };
  }
  const daysSinceLastOrder = est.lastOrderDate
    ? Math.round((Date.now() - est.lastOrderDate.getTime()) / 86400000)
    : 0;
  const score = Math.min(100, Math.max(0, (est.daysOverdue / (est.avgDays ?? 1)) * 100));
  let risk: "high" | "medium" | "low" | "none";
  if (est.daysOverdue >= 7) risk = "high";
  else if (est.daysOverdue >= 3) risk = "medium";
  else if (est.daysOverdue >= 0) risk = "low";
  else risk = "none";
  return { risk, daysSinceLastOrder, score: Math.round(score) };
}

/**
 * Customers due for a visit today: estimated next purchase is due or overdue.
 */
export function dueTodayCustomers(
  customers: CustomerT[],
  orders: OrderT[],
  visitedTodayIds: Set<string>
): { customer: CustomerT; est: ReturnType<typeof estimateNextPurchase> }[] {
  return customers
    .filter((c) => c.active && !visitedTodayIds.has(c.id))
    .map((c) => ({ customer: c, est: estimateNextPurchase(c.id, orders) }))
    .filter((x) => x.est.status === "due" || x.est.status === "overdue")
    .sort((a, b) => b.est.daysOverdue - a.est.daysOverdue)
    .slice(0, 8);
}
