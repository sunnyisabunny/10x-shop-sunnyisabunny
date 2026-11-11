/**
 * NOTE: unit tests for the checks on saved data in `src/utils/guards.ts`.
 * Why it exists: anyone can edit browser storage, so everything read back is checked before the shop uses it. These
 * tests feed the guards broken and hostile data, including the exact cases behind DEBUG-LOG entries 5 and 9.
 * Connects to: `src/utils/guards.ts`, and `PROMO_CODE` and `COUNTRIES` from `src/utils/constants.ts`.
 */
import { describe, expect, it } from "vitest";
import type { CartItem } from "@/types/cart";
import type { OrderRecord } from "@/types/order";
import { COUNTRIES, PROMO_CODE } from "@/utils/constants";
import {
  isCartItem,
  parseAddresses,
  parseAuthUser,
  parseCartState,
  parseOrders,
  parseStoredProfiles,
  parseTheme,
  readFromPath,
} from "@/utils/guards";

/** A cart line that passes every check, so each test can break exactly one thing. */
const LINE: CartItem = { productId: 1, title: "Lamp", thumbnail: "", price: 10, discountPercentage: 5, stock: 4, quantity: 2 };

/** A saved order that passes every check. */
const ORDER: OrderRecord = {
  id: 1_700_000_000_000,
  number: "10X-00001",
  items: [LINE],
  shipping: { fullName: "Ana Test", email: "ana@example.com", phone: "+995555123456", address: "1 Rustaveli Ave", city: "Tbilisi", postalCode: "0108", country: "Georgia" },
  subtotal: 19,
  discount: 0,
  shippingCost: 10,
  total: 29,
  placedAt: "2026-11-10T10:00:00.000Z",
};

/** A cart line has to make sense, not just have the right types: a quantity of -3 is a number too. */
describe("isCartItem", () => {
  it("accepts a sensible line", () => {
    expect(isCartItem(LINE)).toBe(true);
  });

  it("rejects quantities below 1 or above the stock", () => {
    expect(isCartItem({ ...LINE, quantity: -3 })).toBe(false);
    expect(isCartItem({ ...LINE, quantity: 0 })).toBe(false);
    expect(isCartItem({ ...LINE, quantity: LINE.stock + 1 })).toBe(false);
    expect(isCartItem({ ...LINE, quantity: 1.5 })).toBe(false);
  });

  it("rejects a discount over 100% and anything that isn't a line at all", () => {
    expect(isCartItem({ ...LINE, discountPercentage: 150 })).toBe(false);
    expect(isCartItem({ ...LINE, title: undefined })).toBe(false);
    expect(isCartItem(null)).toBe(false);
    expect(isCartItem("lamp")).toBe(false);
  });
});

/** DEBUG-LOG 5: a hand-edited cart once showed a total of −$10.00. */
describe("parseCartState", () => {
  it("drops impossible lines and repeats, keeping the first of each product", () => {
    const saved = { items: [LINE, { ...LINE, quantity: -3 }, { ...LINE, quantity: 1 }, { ...LINE, productId: 2, quantity: 1 }], promoCode: null };
    const cart = parseCartState(saved);
    expect(cart?.items.map((item) => [item.productId, item.quantity])).toEqual([[1, 2], [2, 1]]);
  });

  it("keeps only the real promo code, so editing storage can't invent a discount", () => {
    expect(parseCartState({ items: [], promoCode: PROMO_CODE })?.promoCode).toBe(PROMO_CODE);
    expect(parseCartState({ items: [], promoCode: "FREE99" })?.promoCode).toBeNull();
  });

  it("gives null for something that isn't a cart", () => {
    expect(parseCartState("not a cart")).toBeNull();
    expect(parseCartState({ items: "nope" })).toBeNull();
  });
});

/** DEBUG-LOG 9: the username `constructor` once found a function where a profile should be. */
describe("parseStoredProfiles", () => {
  it("keeps usernames that are also built-in object keys as ordinary profiles", () => {
    const profile = { firstName: "Ana", lastName: "Test", email: "ana@example.com", phone: "" };
    // Written as JSON text, because that is how saved data really arrives. In a JavaScript object literal, `__proto__:`
    // would set the object's prototype instead of adding a key, but JSON.parse keeps it as an ordinary key.
    const one = JSON.stringify(profile);
    const profiles = parseStoredProfiles(JSON.parse(`{"constructor": ${one}, "__proto__": ${one}, "ana": ${one}}`));
    expect(Object.hasOwn(profiles ?? {}, "constructor")).toBe(true);
    expect(Object.hasOwn(profiles ?? {}, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(profiles)).toBe(Object.prototype);
  });

  it("drops entries that aren't profiles", () => {
    expect(parseStoredProfiles({ ana: { firstName: "Ana" } })).toEqual({});
  });
});

/** Router state and small saved values are outside input too. */
describe("small readers", () => {
  it("readFromPath returns where to go back to, or the catalog", () => {
    expect(readFromPath({ from: "/checkout" })).toBe("/checkout");
    expect(readFromPath({ from: 5 })).toBe("/");
    expect(readFromPath(null)).toBe("/");
  });

  it("parseTheme accepts only the two themes", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dakr")).toBeNull();
  });

  it("parseAuthUser keeps only the username, so nothing else, such as a password, survives", () => {
    expect(parseAuthUser({ username: "ana", password: "secret1" })).toEqual({ username: "ana" });
    expect(parseAuthUser({ username: "   " })).toBeNull();
  });
});

/** Saved orders and addresses: broken entries are dropped, and the good ones kept. */
describe("parseOrders and parseAddresses", () => {
  it("keeps good orders and drops broken ones", () => {
    const orders = parseOrders([ORDER, { ...ORDER, placedAt: "not a date" }, { ...ORDER, items: [{ ...LINE, quantity: -1 }] }]);
    expect(orders).toEqual([ORDER]);
    expect(parseOrders({})).toBeNull();
  });

  it("keeps complete addresses in a country the shop offers, once each", () => {
    const home = { address: "1 Rustaveli Ave", city: "Tbilisi", postalCode: "0108", country: COUNTRIES[0] };
    const addresses = parseAddresses([home, { ...home }, { ...home, country: "Narnia" }, { ...home, city: "  " }]);
    expect(addresses).toEqual([home]);
  });
});
