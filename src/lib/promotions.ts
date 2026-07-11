import type { PromotionT } from "@/lib/types";
import type { SegmentId } from "@/lib/segmentation";

export interface AppliedPromo {
  promotion: PromotionT;
  // effective discount in DZD for the given qty (cartons)
  discount: number;
  // free units (cartons) granted
  freeUnits: number;
  // description string
  description: string;
  // whether this is a segment-targeted bonus
  segmentBonus?: boolean;
}

// Segment-based bonus discounts (auto-applied on top of product promos)
const segmentBonusConfig: Record<SegmentId, { percent: number; label: string }> = {
  vip: { percent: 5, label: "VIP -5%" },
  regular: { percent: 2, label: "Regular -2%" },
  occasional: { percent: 0, label: "" },
  at_risk: { percent: 3, label: "Win-back -3%" },
  new: { percent: 5, label: "Welcome -5%" },
  inactive: { percent: 5, label: "Re-engage -5%" },
};

/**
 * Compute segment-based bonus discount for a cart total.
 * VIP: 5% bonus, Regular: 2%, At risk: 3% (win-back), New: 5% (welcome), Inactive: 5% (re-engage)
 */
export function segmentBonusDiscount(segment: SegmentId, cartTotal: number): { discount: number; label: string } | null {
  const cfg = segmentBonusConfig[segment];
  if (!cfg || cfg.percent <= 0 || cartTotal <= 0) return null;
  const discount = Math.round(cartTotal * (cfg.percent / 100) * 100) / 100;
  return { discount, label: cfg.label };
}

/**
 * Compute promo effect for a product+qty.
 * qty is in cartons; unitPrice is per-carton (sellingPrice × packageSize conceptually, but here we treat qty as cartons and unitPrice as per-carton).
 */
export function computePromo(promo: PromotionT, qty: number, unitPrice: number): AppliedPromo | null {
  const now = new Date();
  const start = new Date(promo.startDate);
  const end = new Date(promo.endDate);
  if (now < start || now > end) return null;
  if (!promo.active) return null;

  switch (promo.type) {
    case "DISCOUNT_PERCENT": {
      const discount = Math.round(qty * unitPrice * (promo.value / 100) * 100) / 100;
      return {
        promotion: promo,
        discount,
        freeUnits: 0,
        description: `-${promo.value}%`,
      };
    }
    case "DISCOUNT_AMOUNT": {
      const discount = Math.round(qty * promo.value * 100) / 100;
      return {
        promotion: promo,
        discount,
        freeUnits: 0,
        description: `-${promo.value} DA/u`,
      };
    }
    case "FREE_UNIT":
    case "BUNDLE_XY": {
      // buy `threshold` get `value` free
      if (promo.threshold <= 0) return null;
      const sets = Math.floor(qty / promo.threshold);
      const freeUnits = sets * promo.value;
      if (freeUnits <= 0) return null;
      const discount = Math.round(freeUnits * unitPrice * 100) / 100;
      return {
        promotion: promo,
        discount,
        freeUnits,
        description: `${promo.threshold}+${promo.value} gratuit`,
      };
    }
    default:
      return null;
  }
}

/** Find active promotion for a product. */
export function findPromoForProduct(promotions: PromotionT[], productId: string): PromotionT | null {
  const now = Date.now();
  return (
    promotions.find(
      (p) =>
        p.productId === productId &&
        p.active &&
        new Date(p.startDate).getTime() <= now &&
        new Date(p.endDate).getTime() >= now
    ) ?? null
  );
}

/** Active promos list (currently valid). */
export function activePromotions(promotions: PromotionT[]): PromotionT[] {
  const now = Date.now();
  return promotions.filter(
    (p) => p.active && new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now
  );
}
