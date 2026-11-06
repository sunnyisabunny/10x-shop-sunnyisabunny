/**
 * NOTE: the Checkout page: shipping details, a summary, and placing the order locally (PRD P5).
 * Why it exists: the end of the shopping flow. Nothing is sent anywhere and no payment happens.
 * Connects to: `ProtectedRoute` lets only logged-in users reach this. `CheckoutForm` collects the details, the
 * `Order` class builds the order, and `useOrders` saves it.
 */
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import CartSummary from "../components/cart/CartSummary";
import CheckoutForm from "../components/cart/CheckoutForm";
import { useCart } from "../context/CartContext";
import { useAddresses } from "../hooks/useAddresses";
import { useOrders } from "../hooks/useOrders";
import { Cart } from "../models/Cart";
import { Order } from "../models/Order";
import type { ShippingInfo } from "../types/order";
import { PLACE_ORDER_DELAY_MS } from "../utils/constants";
import { formatPrice, lineTotal } from "../utils/format";

export default function CheckoutPage() {
  const { items, promoCode, clear } = useCart();
  const { records, addOrder } = useOrders();
  const { addresses, addAddress } = useAddresses();
  const navigate = useNavigate();

  /** True for the short moment between pressing the button and the confirmation. */
  const [isPlacing, setIsPlacing] = useState(false);

  /** Set when the order couldn't be saved. The form stays filled in, so nothing has to be typed again. */
  const [failure, setFailure] = useState<string | null>(null);

  /** Holds the running timer, so it can be cancelled. A ref, because changing it needs no redraw. */
  const placeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cancels the timer if you leave the page during that moment. Otherwise the order would still be placed,
  // and your cart emptied, after you had left.
  useEffect(() => () => clearTimeout(placeTimer.current), []);

  /**
   * Simulates placing the order after a short wait. Saving can really fail when storage is full or blocked,
   * and then the cart stays as it was. On success the two steps happen together: go to the order's page, then
   * empty the cart. Emptying first would trip the empty-cart redirect below and lose the confirmation.
   */
  function handlePlaceOrder(shipping: ShippingInfo, saveAddress: boolean) {
    setIsPlacing(true);
    setFailure(null);
    placeTimer.current = setTimeout(() => {
      const order = Order.create(new Cart(items, promoCode), shipping, records);
      if (!addOrder(order)) {
        setFailure("Your order could not be placed. Please try again.");
        setIsPlacing(false);
        return;
      }
      // Saved only now, once the order is real. A full browser storage only loses the address, not the order.
      if (saveAddress) {
        addAddress({ address: shipping.address, city: shipping.city, postalCode: shipping.postalCode, country: shipping.country });
      }
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
      clear();
    }, PLACE_ORDER_DELAY_MS);
  }

  // PRD P5.1: with nothing to buy, go back to the Cart page, which explains that it is empty.
  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <section className="grid gap-3.5 p-3.5 tablet:px-6 tablet:pt-5 tablet:pb-6">
      <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Checkout</h1>
      <div className="grid gap-5 desktop:grid-cols-[minmax(0,1fr)_360px]">
        <CheckoutForm onPlaceOrder={handlePlaceOrder} savedAddresses={addresses} isPlacing={isPlacing} failure={failure} />
        <CartSummary>
          <ul className="grid gap-1 border-t border-edge pt-2.5 text-[13px] text-ink-soft">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3">
                <span>
                  {item.quantity} × {item.title}
                </span>
                <span>{formatPrice(lineTotal(item))}</span>
              </li>
            ))}
          </ul>
        </CartSummary>
      </div>
    </section>
  );
}
