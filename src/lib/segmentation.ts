import type { CustomerT, OrderT, VisitT } from "@/lib/types";
import { estimateNextPurchase } from "@/lib/stats";

export type SegmentId = "vip" | "regular" | "occasional" | "at_risk" | "new" | "inactive";

export interface Segment {
  id: SegmentId;
  label: string;
  color: string;
  bg: string;
  icon: string; // lucide icon name
  count: number;
  description: string;
}

/**
 * Customer segmentation: auto-group customers by purchase patterns.
 * - VIP: A-rated + high order volume (>= 3 orders, avg order > 500)
 * - Regular: B-rated or consistent ordering (>= 2 orders in last 30 days)
 * - Occasional: has orders but infrequent
 * - At risk: churn risk high (overdue >= 7 days)
 * - New: first order < 14 days ago
 * - Inactive: no orders in last 60 days
 */
export function segmentCustomers(
  customers: CustomerT[],
  orders: OrderT[],
  visits: VisitT[]
): Segment[] {
  const now = Date.now();
  const DAY = 86400000;

  const counts: Record<SegmentId, number> = {
    vip: 0, regular: 0, occasional: 0, at_risk: 0, new: 0, inactive: 0,
  };

  for (const c of customers) {
    if (!c.active) continue;
    const co = orders.filter((o) => o.customerId === c.id);
    const lastOrderDate = co.length > 0
      ? new Date(co.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt)
      : null;
    const daysSinceOrder = lastOrderDate ? Math.round((now - lastOrderDate.getTime()) / DAY) : null;
    const totalAmount = co.reduce((s, o) => s + o.totalAmount, 0);
    const avgOrder = co.length > 0 ? totalAmount / co.length : 0;

    // New customer: first order < 14 days ago
    if (co.length > 0 && co.length <= 1 && daysSinceOrder !== null && daysSinceOrder < 14) {
      counts.new++;
      continue;
    }

    // Inactive: no orders in 60+ days
    if (daysSinceOrder === null || daysSinceOrder > 60) {
      counts.inactive++;
      continue;
    }

    // At risk: churn risk high
    const est = estimateNextPurchase(c.id, orders);
    if (est.daysOverdue >= 7) {
      counts.at_risk++;
      continue;
    }

    // VIP: A-rated + high volume
    if (c.rating === "A" && co.length >= 3 && avgOrder > 500) {
      counts.vip++;
      continue;
    }

    // Regular: consistent ordering (>= 2 orders, last < 30 days)
    if (co.length >= 2 && daysSinceOrder < 30) {
      counts.regular++;
      continue;
    }

    // Occasional: has orders but infrequent
    counts.occasional++;
  }

  return [
    { id: "vip", label: "VIP", color: "text-amber-600", bg: "bg-amber-500/15", icon: "Crown", count: counts.vip, description: "highValue" },
    { id: "regular", label: "regular", color: "text-emerald-600", bg: "bg-emerald-500/15", icon: "Repeat", count: counts.regular, description: "consistentOrders" },
    { id: "occasional", label: "occasional", color: "text-sky-600", bg: "bg-sky-500/15", icon: "ShoppingBag", count: counts.occasional, description: "infrequentOrders" },
    { id: "at_risk", label: "atRisk", color: "text-rose-600", bg: "bg-rose-500/15", icon: "AlertTriangle", count: counts.at_risk, description: "churnRiskHigh" },
    { id: "new", label: "newCustomers", color: "text-violet-600", bg: "bg-violet-500/15", icon: "UserPlus", count: counts.new, description: "firstOrderRecent" },
    { id: "inactive", label: "inactive", color: "text-zinc-500", bg: "bg-zinc-500/15", icon: "Moon", count: counts.inactive, description: "noOrders60Days" },
  ];
}

/**
 * Get the segment for a single customer.
 */
export function customerSegment(
  customer: CustomerT,
  orders: OrderT[]
): SegmentId {
  const now = Date.now();
  const DAY = 86400000;
  const co = orders.filter((o) => o.customerId === customer.id);
  const lastOrderDate = co.length > 0
    ? new Date(co.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt)
    : null;
  const daysSinceOrder = lastOrderDate ? Math.round((now - lastOrderDate.getTime()) / DAY) : null;
  const totalAmount = co.reduce((s, o) => s + o.totalAmount, 0);
  const avgOrder = co.length > 0 ? totalAmount / co.length : 0;

  if (co.length > 0 && co.length <= 1 && daysSinceOrder !== null && daysSinceOrder < 14) return "new";
  if (daysSinceOrder === null || daysSinceOrder > 60) return "inactive";
  const est = estimateNextPurchase(customer.id, orders);
  if (est.daysOverdue >= 7) return "at_risk";
  if (customer.rating === "A" && co.length >= 3 && avgOrder > 500) return "vip";
  if (co.length >= 2 && daysSinceOrder < 30) return "regular";
  return "occasional";
}
