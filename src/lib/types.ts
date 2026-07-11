// Shared domain types (mirror Prisma enums for client use)

export type CustomerType =
  | "GROCERY" | "MINI_MARKET" | "SUPERMARKET" | "WHOLESALE"
  | "RESTAURANT" | "FAST_FOOD" | "PIZZERIA" | "BAKERY"
  | "PASTRY_SHOP" | "HOTEL" | "CAFE" | "OTHER";

export type CustomerRating = "A" | "B" | "C";

export type ProductAvailability = "AVAILABLE" | "LOW" | "OUT";

export type VisitResult =
  | "ORDER_CREATED" | "FOLLOW_UP" | "BUSY" | "ABSENT"
  | "CLOSED" | "INFO_COLLECTED" | "NOT_INTERESTED";

export type ObjectionReason =
  | "EXPENSIVE" | "HAS_STOCK" | "LOW_DEMAND" | "USES_COMPETITOR"
  | "NO_MONEY" | "OWNER_ABSENT" | "SHOP_CLOSED" | "OTHER";

export type OrderStatus = "DRAFT" | "CONFIRMED" | "SYNCED";

export type NoteType = "CUSTOMER" | "VISIT" | "AREA" | "PERSONAL";

export type Lang = "ar" | "fr" | "en";

export type Theme = "light" | "dark" | "system";

export interface SectorT { id: string; code: string; name: string; order: number; }
export interface AreaT { id: string; sectorId: string; name: string; order: number; }
export interface ProductCategoryT { id: string; name: string; order: number; }

export interface ProductT {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryId: string;
  sellingPrice: number;
  packageSize: number;
  cartonsPerCase: number;
  availability: ProductAvailability;
  imageUrl: string | null;
  description: string | null;
  isFavorite: boolean;
  order: number;
}

export interface CustomerT {
  id: string;
  shopName: string;
  owner: string;
  phone: string;
  type: CustomerType;
  sectorId: string;
  areaId: string;
  rating: CustomerRating;
  lat: number | null;
  lng: number | null;
  address: string | null;
  lastVisitAt: string | null;
  lastOrderAt: string | null;
  visitOrder: number;
  active: boolean;
}

export interface OrderItemT {
  id: string;
  orderId: string;
  productId: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderT {
  id: string;
  customerId: string;
  repId: string;
  totalCartons: number;
  totalAmount: number;
  grossAmount?: number;
  promoDiscount?: number;
  segmentBonus?: number;
  segmentBonusLabel?: string | null;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
  items?: OrderItemT[];
}

export interface VisitT {
  id: string;
  customerId: string;
  repId: string;
  result: VisitResult;
  objection: ObjectionReason | null;
  notes: string | null;
  durationSec: number;
  createdAt: string;
}

export interface NoteT {
  id: string;
  customerId: string | null;
  areaId: string | null;
  type: NoteType;
  content: string;
  createdAt: string;
}

export interface ObjectiveT {
  id: string;
  repId: string;
  month: string;
  targetCartons: number;
}

export interface CustomerPrefT {
  productId: string;
  timesOrdered: number;
  lastOrderedAt: string | null;
}

export type PromotionType = "DISCOUNT_PERCENT" | "DISCOUNT_AMOUNT" | "FREE_UNIT" | "BUNDLE_XY";

export interface PromotionT {
  id: string;
  name: string;
  type: PromotionType;
  productId: string;
  productName: string;
  value: number;
  threshold: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface RepT {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  monthlyTargetCartons: number;
}

export type DeliveryStatus = "PENDING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "RETURNED";

export interface DeliveryT {
  id: string;
  orderId: string;
  status: DeliveryStatus;
  driverName: string | null;
  driverPhone: string | null;
  notes: string | null;
  deliveredAt: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  totalCartons: number;
  totalAmount: number;
}
