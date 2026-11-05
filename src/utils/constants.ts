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

/** Cart: the one working promo code, and how much it takes off. Its label on screen is built from these. */
export const PROMO_CODE = "10X10";
export const PROMO_PERCENT = 10;

/** Cart: shipping is free from this total upwards, and costs SHIPPING_COST below it. */
export const FREE_SHIPPING_FROM = 100;
export const SHIPPING_COST = 10;

/** The API every product request goes to. */
export const API_BASE_URL = "https://dummyjson.com";

/** Search: how long typing must pause before a request is sent. 5 letters send 1 request, not 5. */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * The catalog's sort options (PRD P2.6). One row each: the value in the URL, the label, and what the API needs.
 * Adding a sort option is one line here, and the dropdown and the request both follow.
 * `as const` keeps each value as its exact text, which is what makes `SortValue` below possible.
 */
export const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "price-asc", label: "Price: low to high", sortBy: "price", order: "asc" },
  { value: "price-desc", label: "Price: high to low", sortBy: "price", order: "desc" },
  { value: "rating-desc", label: "Rating: high to low", sortBy: "rating", order: "desc" },
  { value: "title-asc", label: "Name A→Z", sortBy: "title", order: "asc" },
] as const;

/** The union "" | "price-asc" | ... built from the table above, so the two can never disagree. */
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/** Requests slower than this give up and show an error, so a hung server can't show a skeleton forever. */
export const API_TIMEOUT_MS = 10000;

/** How long a toast message stays on screen, in milliseconds. */
export const TOAST_MS = 3000;

/** The localStorage keys. `as const` makes each value its exact text, so a typo is a type error. */
export const STORAGE_KEYS = {
  cart: "shop_cart",
} as const;
