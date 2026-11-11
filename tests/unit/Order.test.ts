/**
 * NOTE: unit tests for orders in `src/models/Order.ts`: the status over time, the order number, and saving.
 * Why it exists: the status is worked out from the time instead of being saved, and each number comes from the
 * earlier orders, so both are easy to get wrong by one. `getStatus` takes the time as a parameter, which is what
 * makes it testable.
 * Connects to: `Order`, which Checkout creates and the Orders pages rebuild, and `ORDER_STATUS_STEPS` in
 * `src/utils/constants.ts`, whose times these tests use.
 */

import { describe, expect, it } from "vitest";
import { Cart } from "@/models/Cart";
import { Order } from "@/models/Order";
import type { OrderRecord, ShippingInfo } from "@/types/order";
import { ORDER_STATUS_STEPS } from "@/utils/constants";

/** The time limits come from the constants, so a live change to the status times can't break these tests. */
const [processing, shipped] = ORDER_STATUS_STEPS;

const shipping: ShippingInfo = {
  fullName: "Test Buyer",
  email: "buyer@example.com",
  phone: "+995 555 123 456",
  address: "1 Test Street",
  city: "Tbilisi",
  postalCode: "0108",
  country: "Georgia",
};

/** A saved order with nothing in it, placed at a fixed moment. */
const saved: OrderRecord = {
  id: 1,
  number: "10X-00001",
  items: [],
  shipping,
  subtotal: 0,
  discount: 0,
  shippingCost: 0,
  total: 0,
  placedAt: "2026-11-11T10:00:00.000Z",
};

/** The moment `ms` milliseconds after the saved order was placed. */
function after(ms: number): Date {
  return new Date(Date.parse(saved.placedAt) + ms);
}

describe("getStatus", () => {
  const order = Order.from(saved);

  it("is Processing until the first time limit", () => {
    expect(order.getStatus(after(processing.untilMs - 1))).toBe("Processing");
  });

  it("is already Shipped at exactly the first time limit, because the check is 'less than'", () => {
    expect(order.getStatus(after(processing.untilMs))).toBe("Shipped");
  });

  it("is Delivered from the second time limit on", () => {
    expect(order.getStatus(after(shipped.untilMs))).toBe("Delivered");
  });
});

describe("order numbers", () => {
  const emptyCart = new Cart([], null);

  it("starts at 10X-00001", () => {
    expect(Order.create(emptyCart, shipping, []).number).toBe("10X-00001");
  });

  it("continues from the highest number, not the count, so a removed order can't cause a duplicate", () => {
    const existing = [
      { ...saved, number: "10X-00002" },
      { ...saved, number: "10X-00005" },
    ];
    expect(Order.create(emptyCart, shipping, existing).number).toBe("10X-00006");
  });
});

describe("saving and loading", () => {
  it("comes back from JSON as a real Order, with the same data and a working status", () => {
    const order = Order.create(new Cart([], null), shipping, []);
    const loaded = Order.from(JSON.parse(JSON.stringify(order)));
    expect(loaded).toBeInstanceOf(Order);
    expect(loaded.toJSON()).toEqual(order.toJSON());
    expect(loaded.getStatus(new Date(Date.parse(order.placedAt) + processing.untilMs))).toBe("Shipped");
  });
});
