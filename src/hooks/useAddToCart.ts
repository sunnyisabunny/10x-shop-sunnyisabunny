/**
 * NOTE: adds a product to the cart and tells the user what happened.
 * Why it exists: the cards and the product page do exactly the same thing when Add is pressed, so it lives
 * in one custom hook. The cart itself stays free of any knowledge about toasts.
 * Connects to: `CartContext` and `ToastContext`. Used by `ProductGrid` and `ProductPage`.
 */
import { useCallback } from "react";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import type { CartProductInput } from "../types/cart";

export function useAddToCart(): (product: CartProductInput, quantity?: number) => void {
  const { addItem, quantityOf } = useCart();
  const { showToast } = useToast();

  // Both functions it uses are stable, so this one is too. That is what lets React.memo(ProductCard) work.
  return useCallback(
    (product: CartProductInput, quantity = 1) => {
      if (addItem(product, quantity)) {
        showToast("Added to cart ✓");
      } else {
        // The annex asks for an exact message here but gives no text, so PLAN.md defines this one.
        showToast(`Only ${product.stock} available. You already have ${quantityOf(product.id)} in your cart.`);
      }
    },
    [addItem, quantityOf, showToast],
  );
}
