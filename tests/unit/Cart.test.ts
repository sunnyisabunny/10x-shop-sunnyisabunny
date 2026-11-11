/**
 * NOTE: unit tests for the cart's money maths in `src/models/Cart.ts`.
 * Why it exists: the Cart page, Checkout and every saved order get their totals from this one class, so a mistake here
 * would be wrong everywhere at once.
 * Connects to: `src/models/Cart.ts`, and the promo and shipping settings in `src/utils/constants.ts`. The expected
 * values are built from those settings, so a live change such as free shipping from $50 can't break these tests.
 */
import { describe, expect, it } from "vitest";
import { Cart } from "@/models/Cart";
import type { CartItem } from "@/types/cart";
import { FREE_SHIPPING_FROM, PROMO_CODE, PROMO_PERCENT, SHIPPING_COST } from "@/utils/constants";

/** A cart line with no product discount, so each test controls the numbers exactly. */
function line(productId: number, price: number, quantity: number): CartItem {
  return { productId, title: `Product ${productId}`, thumbnail: "", price, discountPercentage: 0, stock: 99, quantity };
}

describe("Cart", () => {
  it("costs nothing when empty, shipping included", () => {
    const cart = new Cart([], null);
    expect([cart.subtotal(), cart.discount(), cart.shipping(), cart.total()]).toEqual([0, 0, 0, 0]);
  });

  it("counts units, not lines", () => {
    expect(new Cart([line(1, 5, 2), line(2, 5, 3)], null).itemCount).toBe(5);
  });

  it("charges shipping below the free-shipping amount, and not from it upwards", () => {
    expect(new Cart([line(1, FREE_SHIPPING_FROM - 1, 1)], null).shipping()).toBe(SHIPPING_COST);
    expect(new Cart([line(1, FREE_SHIPPING_FROM, 1)], null).shipping()).toBe(0);
  });

  it("accepts the promo code in any letter case, with spaces around it", () => {
    expect(Cart.isValidPromo(` ${PROMO_CODE.toLowerCase()} `)).toBe(true);
    expect(Cart.isValidPromo("abc")).toBe(false);
  });

  it("takes the promo percentage off the subtotal", () => {
    const cart = new Cart([line(1, 200, 1)], PROMO_CODE);
    expect(cart.discount()).toBe((200 * PROMO_PERCENT) / 100);
  });

  it("counts shipping after the promo discount, because that is what the customer really pays", () => {
    // Exactly the free-shipping amount, so the discount pulls it just under.
    const cart = new Cart([line(1, FREE_SHIPPING_FROM, 1)], PROMO_CODE);
    expect(cart.shipping()).toBe(SHIPPING_COST);
    expect(cart.total()).toBe(Math.round((cart.subtotal() - cart.discount() + SHIPPING_COST) * 100) / 100);
  });

  it("rounds totals to the cent", () => {
    const cart = new Cart([line(1, 0.1, 1), line(2, 0.2, 1)], null);
    expect(cart.subtotal()).toBe(0.3);
  });
});
