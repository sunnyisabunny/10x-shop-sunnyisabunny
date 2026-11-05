/**
 * NOTE: the Checkout page: shipping details, a summary, and the local order confirmation (PRD P5).
 * Why it exists: the end of the shopping flow. Nothing is sent anywhere and no payment happens.
 * Connects to: `ProtectedRoute` lets only logged-in users reach this. `CheckoutForm` collects the details.
 */
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";
import CartSummary from "../components/cart/CartSummary";
import CheckoutForm from "../components/cart/CheckoutForm";
import { buttonStyles } from "../components/ui/Button";
import { useCart } from "../context/CartContext";
import { PLACE_ORDER_DELAY_MS } from "../utils/constants";
import { discountedPrice, formatPrice } from "../utils/format";

export default function CheckoutPage() {
  const { items, total, clear } = useCart();

  /** The placed order's total. While it is set, the page shows the confirmation instead of the form. */
  const [placedTotal, setPlacedTotal] = useState<number | null>(null);

  /** True for the short moment between pressing the button and the confirmation. */
  const [isPlacing, setIsPlacing] = useState(false);

  /** Holds the running timer, so it can be cancelled. A ref, because changing it needs no redraw. */
  const placeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cancels the timer if you leave the page during that moment. Otherwise it would still fire and
  // clear your cart after you had left.
  useEffect(() => () => clearTimeout(placeTimer.current), []);

  /**
   * Simulates placing the order: a short wait, then the confirmation, then an empty cart. The total is
   * saved first because clearing the cart resets it to 0. It takes no arguments yet: the form passes the
   * shipping details, but at CORE level nothing is stored. Order history uses them later.
   */
  function handlePlaceOrder() {
    setIsPlacing(true);
    placeTimer.current = setTimeout(() => {
      setPlacedTotal(total);
      clear();
      setIsPlacing(false);
    }, PLACE_ORDER_DELAY_MS);
  }

  // This check comes before the empty-cart redirect below, and the order matters: placing an order
  // empties the cart, so the other way round would bounce you to /cart and hide this message.
  if (placedTotal !== null) {
    return (
      <section className="grid justify-items-center gap-3 p-6 text-center tablet:py-10">
        <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.01em]">Thank you! Your order has been placed.</h1>
        <p className="text-ink-soft">Total {formatPrice(placedTotal)}. No payment was taken.</p>
        <Link to="/" className={buttonStyles.primary}>
          Browse products
        </Link>
      </section>
    );
  }

  // PRD P5.1: with nothing to buy, go back to the Cart page, which explains that it is empty.
  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <section className="grid gap-3.5 p-3.5 tablet:px-6 tablet:pt-5 tablet:pb-6">
      <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Checkout</h1>
      <div className="grid gap-5 desktop:grid-cols-[minmax(0,1fr)_360px]">
        <CheckoutForm onPlaceOrder={handlePlaceOrder} isPlacing={isPlacing} />
        <CartSummary>
          <ul className="grid gap-1 border-t border-edge pt-2.5 text-[13px] text-ink-soft">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3">
                <span>
                  {item.quantity} × {item.title}
                </span>
                <span>{formatPrice(discountedPrice(item.price, item.discountPercentage) * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </CartSummary>
      </div>
    </section>
  );
}
