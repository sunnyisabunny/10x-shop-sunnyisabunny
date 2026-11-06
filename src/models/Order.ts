/**
 * NOTE: one order: how it gets created, and what status it has at any moment (PRD P6, T4).
 * Why it exists: the status comes from elapsed time, and the order number from earlier orders. Those rules
 * belong with the order's data, not in a page.
 * Connects to: `CheckoutPage` calls `create`, and the Orders pages call `from` and then `getStatus`.
 *
 * OOP shown here: a `private` constructor plus `static` factories, so an Order can only be built in the two
 * ways that make sense. `getStatus` doesn't change anything, and `toJSON` is the serialisation for storage.
 */
import type { CartItem } from "@/types/cart";
import type { OrderRecord, OrderStatus, ShippingInfo } from "@/types/order";
import { ORDER_STATUS_STEPS } from "@/utils/constants";
import type { Cart } from "./Cart";

/** The next order number: the highest existing plus one, so deleting an order can't produce a duplicate. */
function nextOrderNumber(existing: OrderRecord[]): string {
  const highest = existing.reduce((max, order) => Math.max(max, Number(order.number.replace("10X-", "")) || 0), 0);
  return `10X-${String(highest + 1).padStart(5, "0")}`;
}

export class Order implements OrderRecord {
  readonly id: number;
  readonly number: string;
  readonly items: CartItem[];
  readonly shipping: ShippingInfo;
  readonly subtotal: number;
  readonly discount: number;
  readonly shippingCost: number;
  readonly total: number;
  readonly placedAt: string;

  private constructor(record: OrderRecord) {
    this.id = record.id;
    this.number = record.number;
    this.items = record.items;
    this.shipping = record.shipping;
    this.subtotal = record.subtotal;
    this.discount = record.discount;
    this.shippingCost = record.shippingCost;
    this.total = record.total;
    this.placedAt = record.placedAt;
  }

  /** Makes a new order from the cart. The numbers are copied, so later cart changes can't alter it. */
  static create(cart: Cart, shipping: ShippingInfo, existing: OrderRecord[]): Order {
    const now = new Date();
    return new Order({
      id: now.getTime(),
      number: nextOrderNumber(existing),
      items: cart.lines,
      shipping,
      subtotal: cart.subtotal(),
      discount: cart.discount(),
      shippingCost: cart.shipping(),
      total: cart.total(),
      placedAt: now.toISOString(),
    });
  }

  /** Rebuilds an Order from saved data, because localStorage only holds plain objects with no methods. */
  static from(record: OrderRecord): Order {
    return new Order(record);
  }

  /**
   * The status is calculated from the time, never stored. One input, one answer, so it can't go out of date.
   * `now` is a parameter, so it can be tested with any moment in time.
   */
  getStatus(now: Date = new Date()): OrderStatus {
    const elapsed = now.getTime() - new Date(this.placedAt).getTime();
    const step = ORDER_STATUS_STEPS.find((candidate) => elapsed < candidate.untilMs);
    return step?.status ?? "Delivered";
  }

  /** The plain data to save. JSON.stringify calls this method by itself. */
  toJSON(): OrderRecord {
    return {
      id: this.id,
      number: this.number,
      items: this.items,
      shipping: this.shipping,
      subtotal: this.subtotal,
      discount: this.discount,
      shippingCost: this.shippingCost,
      total: this.total,
      placedAt: this.placedAt,
    };
  }
}
