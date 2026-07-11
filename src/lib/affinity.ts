import type { OrderT } from "@/lib/types";

/**
 * Product affinity: "customers who bought X also bought Y".
 * For a given product, find other products frequently co-ordered by the same customers.
 * Returns array of { productId, name?, timesCoOrdered } sorted by frequency.
 */
export function productAffinity(
  productId: string,
  orders: OrderT[],
  products: { id: string; name: string }[] = []
): { productId: string; name: string; timesCoOrdered: number }[] {
  // Find all orders containing the product
  const ordersWithProduct = orders.filter((o) =>
    o.items?.some((it) => it.productId === productId)
  );

  if (ordersWithProduct.length === 0) return [];

  // Count co-ordered products
  const coOrdered: Record<string, number> = {};
  for (const o of ordersWithProduct) {
    for (const it of o.items ?? []) {
      if (it.productId !== productId) {
        coOrdered[it.productId] = (coOrdered[it.productId] ?? 0) + 1;
      }
    }
  }

  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return Object.entries(coOrdered)
    .map(([pid, count]) => ({
      productId: pid,
      name: productMap.get(pid) ?? "—",
      timesCoOrdered: count,
    }))
    .sort((a, b) => b.timesCoOrdered - a.timesCoOrdered)
    .slice(0, 5);
}

/**
 * Customer product affinity: for a given customer, suggest products that
 * similar customers (who bought the same products) also bought.
 * Returns array of { productId, name, affinityScore } sorted by score.
 */
export function customerProductAffinity(
  customerId: string,
  orders: OrderT[],
  products: { id: string; name: string }[]
): { productId: string; name: string; affinityScore: number }[] {
  // Products this customer has ordered
  const myProducts = new Set(
    orders
      .filter((o) => o.customerId === customerId)
      .flatMap((o) => (o.items ?? []).map((it) => it.productId))
  );

  if (myProducts.size === 0) return [];

  // Find other customers who bought at least one of the same products
  const similarCustomers = new Set<string>();
  for (const o of orders) {
    if (o.customerId === customerId) continue;
    if (o.items?.some((it) => myProducts.has(it.productId))) {
      similarCustomers.add(o.customerId);
    }
  }

  if (similarCustomers.size === 0) return [];

  // Count products bought by similar customers that this customer hasn't bought
  const suggestions: Record<string, number> = {};
  for (const o of orders) {
    if (!similarCustomers.has(o.customerId)) continue;
    for (const it of o.items ?? []) {
      if (!myProducts.has(it.productId)) {
        suggestions[it.productId] = (suggestions[it.productId] ?? 0) + 1;
      }
    }
  }

  const productMap = new Map(products.map((p) => [p.id, p.name]));
  const maxCount = Math.max(...Object.values(suggestions), 1);

  return Object.entries(suggestions)
    .map(([pid, count]) => ({
      productId: pid,
      name: productMap.get(pid) ?? "—",
      affinityScore: Math.round((count / maxCount) * 100),
    }))
    .sort((a, b) => b.affinityScore - a.affinityScore)
    .slice(0, 5);
}
