/**
 * NOTE: type guards: functions that check something's real shape while the app runs.
 * Why it exists: TypeScript's types vanish when the code runs. Values from `catch`, storage or router state
 * could be anything, so `unknown` makes us prove what they are first. `value is X` as the return type tells
 * TypeScript to treat the value as X whenever the guard returned true.
 * Using a guard instead of an `as` cast matters: `as` only silences the compiler, a guard really checks.
 * Connects to: `useFetch`, `StorageService` users and the reducer's exhaustiveness check.
 */
import { ApiError } from "../api/ApiError";
import type { CartItem, CartState } from "../types/cart";
import type { OrderRecord, ShippingInfo } from "../types/order";
import type { ProductSummary, Review, StoredReviews } from "../types/product";
import type { AuthUser, Profile, StoredProfiles } from "../types/user";
import { PROMO_CODE } from "./constants";

/** True for errors from our ApiClient, which carry an HTTP status. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** True for any plain object. It gives the other guards a safe way to read fields from `unknown`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Checks that something is a usable cart line. Checking `typeof` alone isn't enough: a quantity of -3 is a
 * number, and it would make the total negative.
 */
export function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    Number.isInteger(value.productId) &&
    typeof value.title === "string" &&
    typeof value.thumbnail === "string" &&
    typeof value.price === "number" &&
    value.price >= 0 &&
    typeof value.discountPercentage === "number" &&
    value.discountPercentage >= 0 &&
    value.discountPercentage <= 100 &&
    typeof value.stock === "number" &&
    typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) &&
    value.quantity >= 1 &&
    value.quantity <= value.stock
  );
}

/**
 * Keeps the first of any items that share an id. Lists use the id as their React key, and keys must be unique. `<T>`
 * lets the cart and the wishlist share this, even though their ids are in different fields.
 */
function uniqueBy<T>(items: T[], getId: (item: T) => number): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    const id = getId(item);
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

/**
 * Turns saved data into a usable cart, keeping the good lines and dropping the rest, and any repeats. Only the real
 * promo code is kept: anyone can edit storage, and any other text would still earn the discount.
 */
export function parseCartState(value: unknown): CartState | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }
  const items = uniqueBy(value.items.filter(isCartItem), (item) => item.productId);
  return { items, promoCode: value.promoCode === PROMO_CODE ? PROMO_CODE : null };
}

/**
 * Reads where to go after logging in. `location.state` has the type `any`, so this checks its real shape at
 * runtime instead of trusting it. Anything unexpected falls back to the catalog.
 */
export function readFromPath(state: unknown): string {
  return isRecord(state) && typeof state.from === "string" ? state.from : "/";
}

/** The two themes. A union, so "dakr" doesn't compile. */
export type Theme = "dark" | "light";

/** Reads a saved theme. Anything else counts as nothing saved. */
export function parseTheme(value: unknown): Theme | null {
  return value === "dark" || value === "light" ? value : null;
}

/** Reads a saved login. Only the username exists, and a blank one isn't a login. */
export function parseAuthUser(value: unknown): AuthUser | null {
  return isRecord(value) && typeof value.username === "string" && value.username.trim() !== "" ? { username: value.username } : null;
}

/** Checks that something is a usable profile. */
function isProfile(value: unknown): value is Profile {
  return (
    isRecord(value) &&
    typeof value.firstName === "string" &&
    typeof value.lastName === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string"
  );
}

/**
 * Reads saved profiles, keeping only the good ones. `Object.fromEntries` matters here: writing
 * `profiles["__proto__"] = ...` in a loop would change the object's prototype instead of adding a username.
 */
export function parseStoredProfiles(value: unknown): StoredProfiles | null {
  if (!isRecord(value)) {
    return null;
  }
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, Profile] => isProfile(entry[1])));
}

/** Checks that every shipping field is present as text. */
function isShippingInfo(value: unknown): value is ShippingInfo {
  return (
    isRecord(value) &&
    typeof value.fullName === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.address === "string" &&
    typeof value.city === "string" &&
    typeof value.postalCode === "string" &&
    typeof value.country === "string"
  );
}

/** Checks that something is a usable saved order. */
export function isOrderRecord(value: unknown): value is OrderRecord {
  return (
    isRecord(value) &&
    Number.isInteger(value.id) &&
    typeof value.number === "string" &&
    Array.isArray(value.items) &&
    value.items.every(isCartItem) &&
    isShippingInfo(value.shipping) &&
    typeof value.subtotal === "number" &&
    typeof value.discount === "number" &&
    typeof value.shippingCost === "number" &&
    typeof value.total === "number" &&
    typeof value.placedAt === "string" &&
    !Number.isNaN(Date.parse(value.placedAt))
  );
}

/** Turns saved orders into a usable list, dropping any that are broken. */
export function parseOrders(value: unknown): OrderRecord[] | null {
  return Array.isArray(value) ? value.filter(isOrderRecord) : null;
}

/**
 * Checks that something has every field a product card needs, with values that make sense. These feed the card's price
 * and the cart, so a typeof check isn't enough: a discount of 150 would make a negative total.
 */
function isProductSummary(value: unknown): value is ProductSummary {
  return (
    isRecord(value) &&
    Number.isInteger(value.id) &&
    typeof value.title === "string" &&
    typeof value.price === "number" &&
    value.price >= 0 &&
    typeof value.discountPercentage === "number" &&
    value.discountPercentage >= 0 &&
    value.discountPercentage <= 100 &&
    typeof value.rating === "number" &&
    value.rating >= 0 &&
    value.rating <= 5 &&
    typeof value.stock === "number" &&
    Number.isInteger(value.stock) &&
    value.stock >= 0 &&
    typeof value.thumbnail === "string" &&
    typeof value.category === "string" &&
    (value.brand === undefined || typeof value.brand === "string")
  );
}

/** Reads the saved wishlist, keeping the good entries and dropping any repeats. */
export function parseWishlist(value: unknown): ProductSummary[] | null {
  return Array.isArray(value) ? uniqueBy(value.filter(isProductSummary), (item) => item.id) : null;
}

/** Checks that something is a usable review. */
export function isReview(value: unknown): value is Review {
  return (
    isRecord(value) &&
    typeof value.rating === "number" &&
    value.rating >= 1 &&
    value.rating <= 5 &&
    typeof value.comment === "string" &&
    typeof value.date === "string" &&
    typeof value.reviewerName === "string"
  );
}

/**
 * Turns saved reviews into a map of product id to reviews, keeping only the good ones. `Object.fromEntries` for the
 * same reason as `parseStoredProfiles`: an edited `__proto__` key would otherwise break every product page.
 */
export function parseStoredReviews(value: unknown): StoredReviews | null {
  if (!isRecord(value)) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([productId, list]) => [productId, list.filter(isReview)]),
  );
}

/**
 * Proves a switch handled every case. It accepts only `never`, the type of something that can't exist, so
 * calling it stops compiling as soon as any case is left unhandled. The throw is for values from outside the
 * type system, such as a bad action at runtime.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
