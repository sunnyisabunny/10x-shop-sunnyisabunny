/**
 * NOTE: the types for placing and tracking an order.
 * Why it exists: the Checkout form, the saved orders and the Orders pages must agree on these fields.
 * Connects to: `CheckoutForm`, `models/Order.ts` and the Orders pages.
 *
 * There is deliberately no payment method and no card field anywhere. The PRD rules out any banking data.
 */
import type { CartItem } from "./cart";

/** A literal union: the three states an order can be in, and nothing else compiles. */
export type OrderStatus = "Processing" | "Shipped" | "Delivered";

/** The Checkout form's controlled fields. */
export interface ShippingInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

/** An order as plain data, which is the shape saved in localStorage. */
/** The part of the shipping details worth keeping between orders. `Pick`, so it can't fall out of sync. */
export type SavedAddress = Pick<ShippingInfo, "address" | "city" | "postalCode" | "country">;

export interface OrderRecord {
  /** Date.now() at the moment of placing, so it is unique and also sorts by time. */
  id: number;
  /** The number people read, such as "10X-00001". */
  number: string;
  items: CartItem[];
  shipping: ShippingInfo;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  /** An ISO date string. The status is worked out from this, so the status itself is never stored. */
  placedAt: string;
}
