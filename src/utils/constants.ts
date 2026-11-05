/**
 * NOTE: every adjustable value in the shop, in one file.
 * Why it exists: "change the page size" or "raise the password length" should be a one-line edit, and
 * each value should have exactly one home. A value copied into two places eventually disagrees with itself.
 * Connects to: validators, the catalog request, stock badges and the checkout.
 */

/** Login: the shortest password accepted. It also drives the error text, so they can't disagree. */
export const MIN_PASSWORD_LENGTH = 6;

/** Catalog: products per request. Going to 24 here also changes `limit` in the API call. */
export const PAGE_SIZE = 12;

/** Stock: at or below this many, a product shows "Only N left!". */
export const LOW_STOCK_LIMIT = 5;

/** Prices: the discount badge only appears from this percentage. 7 products have discounts under 1%. */
export const MIN_DISCOUNT_BADGE_PERCENT = 1;

/** Checkout: shortest accepted full name, after trimming spaces. */
export const MIN_FULL_NAME_LENGTH = 3;

/** Checkout: shortest accepted address. */
export const MIN_ADDRESS_LENGTH = 5;

/** Checkout: how long the simulated "placing your order" moment lasts, in milliseconds. */
export const PLACE_ORDER_DELAY_MS = 600;

/** The API every product request goes to. */
export const API_BASE_URL = "https://dummyjson.com";

/** The localStorage keys. `as const` makes each value its exact text, so a typo is a type error. */
export const STORAGE_KEYS = {
  cart: "shop_cart",
} as const;
