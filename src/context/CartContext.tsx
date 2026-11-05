/**
 * NOTE: the shopping cart, shared with the whole app through React Context (PRD P4, step 12).
 * Why it exists: the Header's counter, the Cart page, the cards and Checkout must all show the same cart.
 * Connects to: `App.tsx` wraps the app in `CartProvider`, and anything can call `useCart()`.
 *
 * Every update makes a new array and never changes the old one ("immutable"). React compares by
 * reference, so if we changed the old array in place, it would see the same array and not redraw.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CartItem } from "../types/cart";
import type { Product } from "../types/product";
import { STORAGE_KEYS } from "../utils/constants";
import { discountedPrice } from "../utils/format";

/** The product fields a cart line needs. `Pick` copies them from Product, so they can't fall out of sync. */
export type CartProductInput = Pick<Product, "id" | "title" | "thumbnail" | "price" | "discountPercentage" | "stock">;

interface CartContextValue {
  items: CartItem[];
  /** Total units, used for the Header counter. Two of one product counts as 2. */
  itemCount: number;
  /** The sum of discounted price x quantity. */
  total: number;
  /** Returns false when that many would exceed the stock, so the caller can say so. */
  addItem: (product: CartProductInput, quantity?: number) => boolean;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Checks that something from localStorage really is a cart line. JSON has no types, and anyone can edit
 * storage in developer tools, so TypeScript can't promise this. `value is CartItem` is a type guard: when
 * it returns true, TypeScript treats the value as a CartItem from then on.
 */
function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "number" &&
    typeof item.title === "string" &&
    typeof item.thumbnail === "string" &&
    typeof item.price === "number" &&
    typeof item.discountPercentage === "number" &&
    typeof item.stock === "number" &&
    typeof item.quantity === "number"
  );
}

/** Reads the saved cart. Broken or edited data gives an empty cart, not a crash on every page. */
function readStoredCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : [];
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

  const addItem = useCallback((product: CartProductInput, quantity = 1): boolean => {
    const inCart = latestItems.current.find((item) => item.productId === product.id)?.quantity ?? 0;
    if (inCart + quantity > product.stock) {
      return false;
    }
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        // Math.min is a second guard: two very fast clicks can both pass the check above, before the
        // first update has landed, and this keeps the quantity from going over the stock anyway.
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, item.stock) } : item,
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
  }, []);

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
    return { items, itemCount, total: Math.round(total * 100) / 100, addItem, removeItem, setQuantity, clear };
  }, [items, addItem, removeItem, setQuantity, clear]);

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
