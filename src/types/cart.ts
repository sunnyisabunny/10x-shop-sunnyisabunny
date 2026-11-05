/**
 * NOTE: the types for the shopping cart.
 * Why it exists: the cart is the app's main shared state, so its shape is defined once, here.
 * Connects to: `context/cart.reducer.ts`, `context/CartContext.tsx`, `models/Cart.ts` and the cart components.
 */
import type { Product } from "./product";

/**
 * One line in the cart. It copies what a line needs from the product at the moment of adding, so the
 * cart can be drawn, including after a reload, without asking the API again.
 */
export interface CartItem {
  productId: number;
  title: string;
  thumbnail: string;
  price: number;
  discountPercentage: number;
  stock: number;
  quantity: number;
}

/** Everything the cart stores. */
export interface CartState {
  items: CartItem[];
  /** The promo code in use, or null. Saved with the cart, so it survives a reload (PRD P4.4). */
  promoCode: string | null;
}

/**
 * The product fields a cart line needs. `Pick` copies them from Product, so they can't fall out of sync.
 * A narrower type than Product, because Reorder adds items from saved orders, which aren't full products.
 */
export type CartProductInput = Pick<Product, "id" | "title" | "thumbnail" | "price" | "discountPercentage" | "stock">;
