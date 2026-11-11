/**
 * NOTE: unit tests for the cart's rules in `src/context/cart.reducer.ts`.
 * Why it exists: every change to the cart goes through this one function: adding, the stock limit, quantities,
 * removing and clearing. It is pure, so it can be tested without React or a browser. The add-twice test checks it
 * never changes the old state, because React only redraws when it gets a new object.
 * Connects to: `cartReducer`, which `CartContext` runs with `useReducer`, and the types in `src/types/cart.ts`.
 */

import { describe, expect, it } from "vitest";
import { cartReducer } from "@/context/cart.reducer";
import type { CartProductInput, CartState } from "@/types/cart";
import { PROMO_CODE } from "@/utils/constants";

/** One product to reuse. Its stock of 3 is the limit the stock tests push against. */
const lamp: CartProductInput = { id: 1, title: "Lamp", thumbnail: "", price: 10, discountPercentage: 0, stock: 3 };
const empty: CartState = { items: [], promoCode: null };

/** Adds the lamp to a cart, the way the Add to cart button does. */
function addLamp(state: CartState, qty: number): CartState {
  return cartReducer(state, { type: "ADD_ITEM", product: lamp, qty });
}

describe("ADD_ITEM", () => {
  it("adds a new product as one line with the chosen quantity", () => {
    const cart = addLamp(empty, 2);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ productId: lamp.id, quantity: 2 });
  });

  it("adds to the existing line when the product is already in the cart", () => {
    const cart = addLamp(addLamp(empty, 1), 1);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
  });

  it("allows adding up to exactly the stock", () => {
    expect(addLamp(addLamp(empty, 2), 1).items[0].quantity).toBe(lamp.stock);
  });

  it("returns the very same state when an add would go over the stock, so React has nothing to redraw", () => {
    const twoLamps = addLamp(empty, 2);
    expect(addLamp(twoLamps, 2)).toBe(twoLamps);
  });

  it("never changes the old state, so the earlier cart still says 1 after a second add", () => {
    const first = addLamp(empty, 1);
    const second = addLamp(first, 1);
    expect(first.items[0].quantity).toBe(1);
    expect(second.items[0].quantity).toBe(2);
  });
});

describe("SET_QTY", () => {
  it("keeps the quantity between 1 and the stock", () => {
    const cart = addLamp(empty, 1);
    expect(cartReducer(cart, { type: "SET_QTY", productId: lamp.id, qty: 0 }).items[0].quantity).toBe(1);
    expect(cartReducer(cart, { type: "SET_QTY", productId: lamp.id, qty: 99 }).items[0].quantity).toBe(lamp.stock);
  });
});

describe("REMOVE_ITEM and CLEAR", () => {
  it("removes the product's line", () => {
    expect(cartReducer(addLamp(empty, 1), { type: "REMOVE_ITEM", productId: lamp.id }).items).toEqual([]);
  });

  it("empties the cart and drops the promo code", () => {
    const withPromo = cartReducer(addLamp(empty, 1), { type: "APPLY_PROMO", code: PROMO_CODE });
    expect(withPromo.promoCode).toBe(PROMO_CODE);
    expect(cartReducer(withPromo, { type: "CLEAR" })).toEqual({ items: [], promoCode: null });
  });
});
