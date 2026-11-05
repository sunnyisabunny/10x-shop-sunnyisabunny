/**
 * NOTE: the types for the shopping cart.
 * Why it exists: the cart is the app's main shared state, so its shape is defined once, here.
 * Connects to: `context/CartContext.tsx` and the cart components.
 */

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

/** Everything the cart stores. An object, so more fields can be added without changing every caller. */
export interface CartState {
  items: CartItem[];
}
