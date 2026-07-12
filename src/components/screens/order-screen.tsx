"use client";

import { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useDataStore } from "@/store/data-store";
import { useT } from "@/hooks/use-t";
import { formatCurrency, formatCartons } from "@/lib/format";
import { findPromoForProduct, computePromo, segmentBonusDiscount } from "@/lib/promotions";
import { productAffinity } from "@/lib/affinity";
import { customerSegment } from "@/lib/segmentation";
import { ScreenHeader, EmptyState } from "@/components/shared/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, Plus, Minus, ShoppingCart, Check, Repeat,
  Sparkles, Clock, Star, Package, Loader2, Trash2, Tag, ScanLine, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { SuccessOverlay } from "@/components/shared/success-overlay";
import { BarcodeScannerDialog } from "@/components/shared/barcode-scanner";
import type { CartLine } from "@/store/app-store";

export function OrderScreen() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const params = useAppStore((s) => s.params);
  const back = useAppStore((s) => s.back);
  const go = useAppStore((s) => s.go);
  const cart = useAppStore((s) => s.cart);
  const setCart = useAppStore((s) => s.setCart);
  const cartCustomerId = useAppStore((s) => s.cartCustomerId);
  const setCartCustomerId = useAppStore((s) => s.setCartCustomerId);
  const addCartLine = useAppStore((s) => s.addCartLine);
  const updateCartQty = useAppStore((s) => s.updateCartQty);
  const removeCartLine = useAppStore((s) => s.removeCartLine);
  const clearCart = useAppStore((s) => s.clearCart);
  const { customers, products, orders, prefs, promotions, addOrder, upsertCustomer, setCustomerPrefs, rep, addVisit } = useDataStore();

  const customerId = params.customerId as string;
  const customer = customers.find((c) => c.id === customerId);
  const fromVisit = (params.fromVisit as boolean) ?? false;
  // Track unit type per product: "carton" or "palette"
  const [unitTypes, setUnitTypes] = useState<Record<string, "carton" | "palette">>({});

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"suggested" | "recent" | "favorites" | "all">("all");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  function handleBarcodeMatch(code: string) {
    const c = code.trim().toLowerCase();
    const product = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === c) ||
        (p.sku && p.sku.toLowerCase() === c)
    );
    if (product) {
      if (product.availability === "OUT") {
        toast.error(t("outOfStock"));
        return;
      }
      setTab("all");
      setQuery("");
      addCartLine({ productId: product.id, qty: 1, unitPrice: product.sellingPrice });
      toast.success(`${t("productFound")}: ${product.name}`);
    } else {
      toast.error(t("productNotFound"));
    }
  }

  // reset cart when customer changes
  useEffect(() => {
    if (cartCustomerId !== customerId) {
      setCart([]);
      setCartCustomerId(customerId);
    }
  }, [customerId, cartCustomerId]);

  const customerPrefs = prefs[customerId] ?? [];
  const lastOrder = orders.find((o) => o.customerId === customerId);
  const lastOrderItems = lastOrder?.items ?? [];

  const suggested = useMemo(() => {
    const prefIds = new Set(customerPrefs.map((p) => p.productId));
    return products
      .filter((p) => p.availability !== "OUT")
      .sort((a, b) => {
        const pa = customerPrefs.find((x) => x.productId === a.id)?.timesOrdered ?? 0;
        const pb = customerPrefs.find((x) => x.productId === b.id)?.timesOrdered ?? 0;
        if (pb !== pa) return pb - pa;
        return a.order - b.order;
      })
      .filter((p) => prefIds.has(p.id) ? true : false)
      .slice(0, 12);
  }, [products, customerPrefs]);

  const recent = useMemo(() => {
    const ids = new Set<string>();
    for (const o of orders) {
      if (o.customerId !== customerId) continue;
      for (const it of o.items ?? []) ids.add(it.productId);
    }
    return products.filter((p) => ids.has(p.id) && p.availability !== "OUT");
  }, [products, orders, customerId]);

  const favorites = useMemo(() => products.filter((p) => p.isFavorite && p.availability !== "OUT"), [products]);

  const allAvailable = useMemo(
    () => products.filter((p) => p.availability !== "OUT").sort((a, b) => a.order - b.order),
    [products]
  );

  const list = tab === "suggested" ? suggested : tab === "recent" ? recent : tab === "favorites" ? favorites : allAvailable;
  const filtered = query.trim()
    ? list.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : list;

  const cartQty = (pid: string) => cart.find((c) => c.productId === pid)?.qty ?? 0;

  function setQty(pid: string, unitPrice: number, qty: number) {
    if (qty <= 0) {
      removeCartLine(pid);
    } else {
      const exists = cart.find((c) => c.productId === pid);
      if (exists) updateCartQty(pid, qty);
      else addCartLine({ productId: pid, qty, unitPrice });
    }
  }

  // Manual quantity input handler
  function handleQtyInput(pid: string, unitPrice: number, value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      if (value === "") removeCartLine(pid);
      return;
    }
    setQty(pid, unitPrice, num);
  }

  // Toggle unit type between carton and palette
  function toggleUnit(pid: string) {
    setUnitTypes(prev => ({ ...prev, [pid]: prev[pid] === "palette" ? "carton" : "palette" }));
  }

  function repeatLastOrder() {
    if (!lastOrderItems.length) {
      toast.error(t("noOrders"));
      return;
    }
    const lines: CartLine[] = lastOrderItems.map((it) => ({
      productId: it.productId,
      qty: it.qty,
      unitPrice: it.unitPrice,
    })).filter((l) => {
      const p = products.find((x) => x.id === l.productId);
      return p && p.availability !== "OUT";
    });
    setCart(lines);
    toast.success(t("repeatLastOrder"));
  }

  const totalCartons = cart.reduce((s, c) => s + c.qty, 0);
  const grossAmount = cart.reduce((s, c) => s + c.qty * c.unitPrice, 0);
  const promoLines = cart
    .map((c) => {
      const promo = findPromoForProduct(promotions, c.productId);
      if (!promo) return null;
      const applied = computePromo(promo, c.qty, c.unitPrice);
      return applied && applied.discount > 0 ? { line: c, promo, applied } : null;
    })
    .filter(Boolean) as { line: CartLine; promo: NonNullable<ReturnType<typeof findPromoForProduct>>; applied: NonNullable<ReturnType<typeof computePromo>> }[];
  const totalDiscount = promoLines.reduce((s, p) => s + p.applied.discount, 0);
  const customerSegmentId = customer ? customerSegment(customer, orders) : "occasional";
  const segBonus = customer ? segmentBonusDiscount(customerSegmentId, grossAmount - totalDiscount) : null;
  const segBonusDiscount = segBonus?.discount ?? 0;
  const totalAmount = Math.max(0, grossAmount - totalDiscount - segBonusDiscount);

  const cartProductIds = new Set(cart.map((c) => c.productId));
  const fbtSuggestions = useMemo(() => {
    if (cart.length === 0) return [];
    const scoreMap: Record<string, number> = {};
    for (const line of cart) {
      const aff = productAffinity(line.productId, orders, products);
      for (const a of aff) {
        if (!cartProductIds.has(a.productId)) {
          scoreMap[a.productId] = (scoreMap[a.productId] ?? 0) + a.timesCoOrdered;
        }
      }
    }
    return Object.entries(scoreMap)
      .map(([pid, score]) => {
        const p = products.find((x) => x.id === pid);
        return p && p.availability !== "OUT" ? { product: p, score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.score - a!.score))
      .slice(0, 4) as { product: typeof products[0]; score: number }[];
  }, [cart, orders, products, cartProductIds]);

  async function submitOrder() {
    if (!customer || cart.length === 0) return;
    setSubmitting(true);
    const items = cart.map((c) => ({
      productId: c.productId,
      qty: c.qty,
      unitPrice: c.unitPrice,
      subtotal: c.qty * c.unitPrice,
    }));
    const tempId = `local-${Date.now()}`;
    const order = {
      id: tempId,
      customerId,
      repId: rep?.id ?? "local",
      totalCartons,
      totalAmount,
      status: "CONFIRMED" as const,
      note: null,
      createdAt: new Date().toISOString(),
      items,
    };
    addOrder(order);
    upsertCustomer({ ...customer, lastOrderAt: order.createdAt });
    const newPrefs = [...customerPrefs];
    for (const it of items) {
      const ex = newPrefs.find((p) => p.productId === it.productId);
      if (ex) ex.timesOrdered += 1;
      else newPrefs.push({ productId: it.productId, timesOrdered: 1, lastOrderedAt: order.createdAt });
    }
    setCustomerPrefs(customerId, newPrefs);
    clearCart();
    toast.success(t("orderConfirmed"));
    setShowSuccess(true);

    try {
      const { createOrder } = await import("@/lib/dexie-data");
      const created = await createOrder({ customerId, repId: rep?.id ?? "local", items: items.map((i) => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })), grossAmount, promoDiscount: totalDiscount, segmentBonus: segBonusDiscount, segmentBonusLabel: segBonus?.label ?? null });
      const ds = useDataStore.getState();
      useDataStore.setState({ orders: ds.orders.map((o) => (o.id === tempId ? created : o)) });
    } catch { /* keep local */ }
    setSubmitting(false);
    // navigate after success overlay shows
    setTimeout(() => {
      if (fromVisit) {
        // Save visit as ORDER_CREATED, then go to next customer in route
        const visitTempId = `local-visit-${Date.now()}`;
        const visit = {
          id: visitTempId,
          customerId,
          repId: rep?.id ?? "local",
          result: "ORDER_CREATED" as const,
          objection: null,
          notes: null,
          durationSec: 0,
          createdAt: new Date().toISOString(),
        };
        addVisit(visit);
        upsertCustomer({ ...customer, lastVisitAt: visit.createdAt });
        try {
          import("@/lib/dexie-data").then(({ createVisit }) => {
            createVisit({ customerId, repId: rep?.id ?? "local", result: "ORDER_CREATED", objection: null, notes: null, durationSec: 0 }).then((created) => {
              const ds = useDataStore.getState();
              useDataStore.setState({ visits: ds.visits.map((v) => (v.id === visitTempId ? created : v)) });
            });
          });
        } catch { /* keep local */ }
        // Move to next customer in route
        const { nextInRoute } = useAppStore.getState();
        nextInRoute();
        go("route", {});
      } else {
        const returnTo = (params.returnTo as string) ?? "customer";
        go(returnTo as any, { customerId });
      }
    }, 1100);
  }

  if (!customer) {
    return (
      <div>
        <ScreenHeader title={t("quickOrder")} />
        <EmptyState title={t("noCustomers")} />
      </div>
    );
  }

  const tabs = [
    { v: "suggested" as const, label: t("suggestedProducts"), icon: Sparkles, count: suggested.length, show: suggested.length > 0 },
    { v: "recent" as const, label: t("recentlyOrdered"), icon: Clock, count: recent.length, show: recent.length > 0 },
    { v: "favorites" as const, label: t("favorites"), icon: Star, count: favorites.length, show: favorites.length > 0 },
    { v: "all" as const, label: t("allProducts"), icon: Package, count: allAvailable.length, show: true },
  ].filter((x) => x.show);

  return (
    <div className="min-h-dynamic flex flex-col">
      <ScreenHeader
        title={t("quickOrder")}
        subtitle={customer.shopName}
        right={
          lastOrderItems.length > 0 ? (
            <Button variant="ghost" size="sm" className="tap-scale" onClick={repeatLastOrder}>
              <Repeat className="h-4 w-4 me-1" /> {t("repeatLastOrder")}
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          return (
            <button
              key={tb.v}
              onClick={() => setTab(tb.v)}
              className={cn(
                "shrink-0 h-9 px-3 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 tap-scale",
                tab === tb.v ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tb.label}
              <span className={cn("text-[10px] rounded-full px-1", tab === tb.v ? "bg-white/20" : "bg-muted")}>{tb.count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Scan */}
      <div className="px-4 pt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchProducts")}
            className="h-11 ps-9 rounded-xl bg-muted/60 border-0"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl tap-scale border-primary/30 text-primary shrink-0"
          onClick={() => setScanOpen(true)}
          aria-label={t("scanProduct")}
        >
          <ScanLine className="h-5 w-5" />
        </Button>
      </div>

      {/* Frequently bought together */}
      {fbtSuggestions.length > 0 && (
        <div className="px-4 pt-3">
          <p className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> {t("frequentlyBought")}
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {fbtSuggestions.map(({ product: p, score }) => (
              <button
                key={p.id}
                onClick={() => addCartLine({ productId: p.id, qty: 1, unitPrice: p.sellingPrice })}
                className="shrink-0 w-32 p-2 rounded-xl border-2 border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/10 tap-scale text-start"
              >
                <div className="aspect-square rounded-lg bg-muted grid place-items-center mb-1">
                  <Package className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-[11px] font-medium line-clamp-2 leading-tight min-h-[2rem]">{p.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{formatCurrency(p.sellingPrice, lang)}</span>
                  <span className="text-[9px] text-amber-600 font-bold">+{score}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product grid — with manual quantity input + palette/carton toggle */}
      <div className="flex-1 px-4 pt-3 grid grid-cols-1 gap-3 pb-64">
        {filtered.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title={t("noProducts")} />
        ) : (
          filtered.map((p) => {
            const qty = cartQty(p.id);
            const cat = useDataStore.getState().categories.find((c) => c.id === p.categoryId);
            const promo = findPromoForProduct(promotions, p.id);
            const applied = promo && qty > 0 ? computePromo(promo, qty, p.sellingPrice) : null;
            const unitType = unitTypes[p.id] ?? "carton";
            return (
              <Card key={p.id} className={cn("p-3 flex items-center gap-3 relative", qty > 0 && "ring-2 ring-primary", promo && "ring-1 ring-amber-400/50")}>
                {qty > 0 && (
                  <span className="absolute -top-2 -end-2 h-6 min-w-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center z-10">
                    {qty}
                  </span>
                )}
                {promo && (
                  <span className="absolute -top-2 -start-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center gap-0.5 z-10 shadow">
                    <Tag className="h-2.5 w-2.5" /> {t("promotion")}
                  </span>
                )}
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 grid place-items-center shrink-0">
                  <Package className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{cat?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-primary">{formatCurrency(p.sellingPrice, lang)}</span>
                    {applied && applied.discount > 0 && (
                      <span className="text-[10px] text-emerald-600 font-semibold">−{formatCurrency(applied.discount, lang)}</span>
                    )}
                  </div>
                  {promo && <p className="text-[10px] text-amber-600 font-medium mt-0.5 leading-tight">{promo.name}</p>}
                </div>

                {/* Right side: unit toggle + manual quantity input */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {/* Palette/Carton toggle */}
                  <button
                    onClick={() => toggleUnit(p.id)}
                    className={cn(
                      "h-7 px-2 rounded-lg text-[10px] font-bold border-2 transition-colors tap-scale flex items-center gap-1",
                      unitType === "palette" ? "border-violet-500 bg-violet-500/10 text-violet-600" : "border-border bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <Layers className="h-3 w-3" />
                    {unitType === "palette" ? "Palette" : "Carton"}
                  </button>

                  {/* Manual quantity input */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQty(p.id, p.sellingPrice, Math.max(0, qty - 1))}
                      className="h-8 w-8 rounded-lg bg-muted grid place-items-center tap-scale shrink-0"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={qty > 0 ? qty : ""}
                      onChange={(e) => handleQtyInput(p.id, p.sellingPrice, e.target.value)}
                      placeholder="0"
                      className="w-14 h-8 text-center text-sm font-bold rounded-lg border border-border bg-card outline-none focus:border-primary tabular-nums"
                      min="0"
                      step="0.5"
                    />
                    <button
                      onClick={() => setQty(p.id, p.sellingPrice, qty + 1)}
                      className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center tap-scale shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Cart bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t p-3 pb-safe"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">
                    {formatCartons(totalCartons)} {t("cartonsShort")}
                  </span>
                  <span className="text-xs text-muted-foreground ms-1">({cart.length})</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {(totalDiscount > 0 || segBonusDiscount > 0) && (
                    <span className="text-[11px] text-muted-foreground line-through">{formatCurrency(grossAmount, lang)}</span>
                  )}
                  <span className="text-sm font-bold text-primary">{formatCurrency(totalAmount, lang)}</span>
                  {totalDiscount > 0 && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">
                      <Tag className="h-2.5 w-2.5 me-0.5" />−{formatCurrency(totalDiscount, lang)}
                    </Badge>
                  )}
                  {segBonusDiscount > 0 && segBonus && (
                    <Badge className="bg-violet-500/15 text-violet-600 border-0 text-[10px]">
                      <Sparkles className="h-2.5 w-2.5 me-0.5" />{segBonus.label}
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => clearCart()}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-0.5 mt-0.5"
                >
                  <Trash2 className="h-3 w-3" /> {t("clear")}
                </button>
              </div>
              <Button
                className="h-12 px-6 rounded-xl font-semibold tap-scale"
                onClick={submitOrder}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 me-1" />}
                {t("confirmOrder")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SuccessOverlay show={showSuccess} message={t("orderConfirmed")} onDone={() => setShowSuccess(false)} />

      <BarcodeScannerDialog open={scanOpen} onOpenChange={setScanOpen} onMatch={handleBarcodeMatch} />
    </div>
  );
}
