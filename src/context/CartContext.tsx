/**
 * NOTE: the shopping cart, shared with the whole app through React Context (PRD P4, step 12).
 * Why it exists: the Header's counter, the Cart page, the cards and Checkout must all show the same cart.
 * Connects to: `App.tsx` wraps the app in `CartProvider`, and anything can call `useCart()`. The update rules
 * live in `cart.reducer.ts`, and the money maths in `models/Cart.ts`.
 *
 * This started as useState with five callbacks. It moved to useReducer once promo codes arrived, because
 * the rules had grown enough to deserve one place, and a pure reducer can be read and tested alone.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { Cart } from "../models/Cart";
import { StorageService } from "../models/StorageService";
import type { CartItem, CartProductInput, CartState } from "../types/cart";
import { STORAGE_KEYS } from "../utils/constants";
import { parseCartState } from "../utils/guards";
import { cartReducer } from "./cart.reducer";

/** Everything components get from `useCart()`: the cart's state, plus what is worked out from it and the actions. */
interface CartContextValue extends CartState {
  /** Total units, used for the Header counter. */
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  /** Returns false when that many would exceed the stock, so the caller can say so. */
  addItem: (product: CartProductInput, quantity?: number) => boolean;
  /** How many of a product are in the cart right now. */
  quantityOf: (productId: number) => number;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
  /** Returns false for a wrong code, so the form can show its error. */
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** The one way this app reads and writes the cart in localStorage. */
const cartStorage = new StorageService<CartState>(STORAGE_KEYS.cart, parseCartState);

/** The starting state. A function, so React runs it once ("lazy init") and not on every render. */
function loadCart(): CartState {
  return cartStorage.get() ?? { items: [], promoCode: null };
}

export function CartProvider({ children }: { children: ReactNode }) {
  /** The third argument is the lazy init: the reducer starts from whatever is saved. */
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart);

  /**
   * Always holds the newest items, so `addItem` can check the stock without depending on them. If it
   * depended on the items, it would be a new function after every change, and every memoised card would redraw.
   */
  const latestItems = useRef<CartItem[]>(state.items);

  // Runs after every cart change: remembers the newest items and saves them. The reducer can't do this,
  // because it must stay pure. If saving fails, the cart still works for this visit.
  useEffect(() => {
    latestItems.current = state.items;
    cartStorage.set(state);
  }, [state]);

  // Keeps other tabs honest. The browser fires `storage` only in the tabs that did NOT make the change.
  // Without this, each tab keeps its own copy, and the last one to change overwrites the other's cart.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEYS.cart) {
        dispatch({ type: "REPLACE", state: loadCart() });
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const quantityOf = useCallback((productId: number): number => {
    return latestItems.current.find((item) => item.productId === productId)?.quantity ?? 0;
  }, []);

  const addItem = useCallback(
    (product: CartProductInput, quantity = 1): boolean => {
      if (quantityOf(product.id) + quantity > product.stock) {
        return false;
      }
      dispatch({ type: "ADD_ITEM", product, qty: quantity });
      return true;
    },
    [quantityOf],
  );

  const removeItem = useCallback((productId: number) => dispatch({ type: "REMOVE_ITEM", productId }), []);
  const setQuantity = useCallback((productId: number, qty: number) => dispatch({ type: "SET_QTY", productId, qty }), []);
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);
  const removePromo = useCallback(() => dispatch({ type: "REMOVE_PROMO" }), []);

  const applyPromo = useCallback((code: string): boolean => {
    if (!Cart.isValidPromo(code)) {
      return false;
    }
    dispatch({ type: "APPLY_PROMO", code: code.trim().toUpperCase() });
    return true;
  }, []);

  /** `useMemo` rebuilds this only when the cart changes, so a redraw elsewhere doesn't redraw every user of it. */
  const value = useMemo<CartContextValue>(() => {
    const cart = new Cart(state.items, state.promoCode);
    return {
      ...state,
      itemCount: cart.itemCount,
      subtotal: cart.subtotal(),
      discount: cart.discount(),
      shipping: cart.shipping(),
      total: cart.total(),
      addItem,
      quantityOf,
      removeItem,
      setQuantity,
      clear,
      applyPromo,
      removePromo,
    };
  }, [state, addItem, quantityOf, removeItem, setQuantity, clear, applyPromo, removePromo]);

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
