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
import type { Review, StoredReviews } from "../types/product";

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
 * Turns saved data into a usable cart, keeping the good lines and dropping the rest. Repeated products are
 * dropped too, because the Cart page uses `productId` as its React key, and keys must be unique.
 */
export function parseCartState(value: unknown): CartState | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }
  const seen = new Set<number>();
  const items = value.items.filter(isCartItem).filter((item) => {
    if (seen.has(item.productId)) {
      return false;
    }
    seen.add(item.productId);
    return true;
  });
  return { items, promoCode: typeof value.promoCode === "string" ? value.promoCode : null };
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

/** Turns saved reviews into a map of product id to reviews, keeping only the good ones. */
export function parseStoredReviews(value: unknown): StoredReviews | null {
  if (!isRecord(value)) {
    return null;
  }
  const reviews: StoredReviews = {};
  for (const [productId, list] of Object.entries(value)) {
    if (Array.isArray(list)) {
      reviews[productId] = list.filter(isReview);
    }
  }
  return reviews;
}

/**
 * Proves a switch handled every case. It accepts only `never`, the type of something that can't exist, so
 * calling it stops compiling as soon as any case is left unhandled. The throw is for values from outside the
 * type system, such as a bad action at runtime.
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
