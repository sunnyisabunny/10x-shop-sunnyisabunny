/**
 * NOTE: the LED strip under the header, with the machine's messages running across it (beyond the spec).
 * Why it exists: it gives the shop its voice, and it tells the truth: the free-shipping line reads the real cart.
 * Connects to: `ExtrasHost` draws this into the `ticker-slot` that `Layout` sets aside, so the page doesn't jump.
 * It is decoration, so `aria-hidden` keeps it from screen readers, which get these facts from the cart itself.
 */
import { createPortal } from "react-dom";
import { useLocation } from "react-router";
import { useCart } from "../context/CartContext";
import { FREE_SHIPPING_FROM, PROMO_CODE, PROMO_PERCENT } from "../utils/constants";
import { formatPrice } from "../utils/format";
import { useSlot } from "./useSlot";

/** The machine's own remarks. The lemon is real: $0.79 less 9.7% is 71 cents. The car is real too, and is not. */
const REMARKS = ["EXACT CHANGE NOT REQUIRED", "THE LEMON IS 71 CENTS", "THE CAR IS NOT"];

/** What the strip says on an order's page. */
const AFTER_ORDER = ["ORDER RECEIVED", "PLEASE TAKE YOUR RECEIPT", "NOTHING WAS CHARGED"];

/** How far the cart is from free shipping. It uses the amount after the promo discount, as the cart's own rule does. */
function shippingLine(spent: number): string {
  const left = FREE_SHIPPING_FROM - spent;
  return left > 0 ? `${formatPrice(left)} TO FREE SHIPPING` : "SHIPPING IS FREE NOW";
}

export default function LedTicker() {
  const slot = useSlot("ticker-slot");
  const { subtotal, discount } = useCart();
  const { pathname } = useLocation();

  if (slot === null) {
    return null;
  }

  const lines = pathname.startsWith("/orders/") ? AFTER_ORDER : [`USE CODE ${PROMO_CODE} FOR ${PROMO_PERCENT}% OFF`, shippingLine(subtotal - discount), ...REMARKS];

  return createPortal(
    // Written twice: the animation moves the strip by exactly half its length, then starts again, and nobody sees the join.
    // An index is a fine key here, because these lines never change places.
    <div aria-hidden="true" className="ticker-track">
      {[...lines, ...lines].map((line, index) => (
        <span key={index}>{line}</span>
      ))}
    </div>,
    slot,
  );
}
