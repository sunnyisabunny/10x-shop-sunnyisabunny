/**
 * NOTE: the shopping cart, shared with the whole app through React Context (PRD P4, step 12).
 * Why it exists: the Header's counter, the Cart page, the cards and Checkout must all show the same cart.
 * Connects to: `App.tsx` wraps the app in `CartProvider`, and anything can call `useCart()`.
 *
 * Every update makes a new array and never changes the old one ("immutable"). React compares by
 * reference, so if we changed the old array in place, it would see the same array and not redraw.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CartItem, CartState } from "../types/cart";
import type { Product } from "../types/product";
import { STORAGE_KEYS } from "../utils/constants";
import { discountedPrice } from "../utils/format";

/** The product fields a cart line needs. `Pick` copies them from Product, so they can't fall out of sync. */
export type CartProductInput = Pick<Product, "id" | "title" | "thumbnail" | "price" | "discountPercentage" | "stock">;

/** Everything components get from `useCart()`: the cart's state, plus what is worked out from it and the actions. */
interface CartContextValue extends CartState {
  /** Total units, used for the Header counter. Two of one product counts as 2. */
  itemCount: number;
  /** The sum of discounted price x quantity. */
  total: number;
  /** Returns false when that many would exceed the stock, so the caller can say so. */
  addItem: (product: CartProductInput, quantity?: number) => boolean;
  /** How many of a product are in the cart right now. */
  quantityOf: (productId: number) => number;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Checks that something from localStorage really is a usable cart line. JSON has no types, and anyone can
 * edit storage in developer tools, so TypeScript can't promise this. `value is CartItem` is a type guard:
 * when it returns true, TypeScript treats the value as a CartItem from then on.
 * Checking `typeof` alone isn't enough: a quantity of -3 is a number, and it would make the total negative.
 */
function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  // Only widens `object` so the fields can be read. Each field's real type is checked just below.
  const item = value as Record<string, unknown>;
  return (
    Number.isInteger(item.productId) &&
    typeof item.title === "string" &&
    typeof item.thumbnail === "string" &&
    typeof item.price === "number" &&
    item.price >= 0 &&
    typeof item.discountPercentage === "number" &&
    item.discountPercentage >= 0 &&
    item.discountPercentage <= 100 &&
    typeof item.stock === "number" &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= item.stock
  );
}

/**
 * Reads the saved cart. Broken or edited data gives an empty cart, not a crash on every page. Repeated
 * products are dropped too, because the Cart page uses `productId` as its React key, and keys must be unique.
 */
function readStoredCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    const seen = new Set<number>();
    return parsed.filter(isCartItem).filter((item) => {
      if (seen.has(item.productId)) {
        return false;
      }
      seen.add(item.productId);
      return true;
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  /**
   * The cart lines. Passing the function itself, not its result, is "lazy init": React runs it only on the
   * first render. Otherwise it would parse localStorage again on every render.
   */
  const [items, setItems] = useState<CartItem[]>(readStoredCart);

  /**
   * Always holds the newest items, so `addItem` can check the stock without depending on `items`. If it
   * depended on `items`, it would be a new function after every change, and every memoised card would redraw.
   */
  const latestItems = useRef(items);

  // Runs after every cart change: remembers the newest items and saves them, so the cart survives a reload.
  useEffect(() => {
    latestItems.current = items;
    // Saving can fail when storage is full or the visitor blocks site data. Without this catch, the error
    // would crash the whole shop on load. The cart still works for this visit and is just not saved.
    try {
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(items));
    } catch {
      return;
    }
  }, [items]);

  const quantityOf = useCallback((productId: number): number => {
    return latestItems.current.find((item) => item.productId === productId)?.quantity ?? 0;
  }, []);

  const addItem = useCallback((product: CartProductInput, quantity = 1): boolean => {
    if (quantityOf(product.id) + quantity > product.stock) {
      return false;
    }
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        // The stock is refreshed from the product, because the saved number may be old. Math.min is a second
        // guard: two very fast clicks can both pass the check above before the first update has landed.
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, stock: product.stock, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item,
        );
      }
      const newItem: CartItem = {
        productId: product.id,
        title: product.title,
        thumbnail: product.thumbnail,
        price: product.price,
        discountPercentage: product.discountPercentage,
        stock: product.stock,
        quantity,
      };
      return [...current, newItem];
    });
    return true;
  }, [quantityOf]);

  const removeItem = useCallback((productId: number) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  /** Keeps the quantity between 1 and the stock, as the PRD says. Removing is a separate, deliberate action. */
  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.min(Math.max(1, quantity), item.stock) } : item,
      ),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + discountedPrice(item.price, item.discountPercentage) * item.quantity, 0);
    // Rounded to cents, because adding many decimals can leave a tiny floating-point remainder.
    return { items, itemCount, total: Math.round(total * 100) / 100, addItem, quantityOf, removeItem, setQuantity, clear };
  }, [items, addItem, quantityOf, removeItem, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** How components read the cart. Throws a clear message if the provider is missing. */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === null) {
    throw new Error("useCart must be used inside CartProvider.");
  }
  return context;
}
