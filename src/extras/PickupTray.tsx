/**
 * NOTE: the machine's pickup tray: the dark slot at the bottom that holds what's in your cart, and opens it (beyond the spec).
 * Why it exists: it makes the cart feel physical, and it gives the falling product somewhere to land.
 * Connects to: `ExtrasHost` draws this into the `tray-slot` that `Layout` sets aside. It only reads the cart.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router";
import { useCart } from "../context/CartContext";
import { useSlot } from "./useSlot";

/** How many pictures fit in the tray on a wide screen. Narrower screens show fewer, and the newest come first, so they stay in sight. */
const MOST_SHOWN = 9;

export default function PickupTray() {
  const slot = useSlot("tray-slot");
  const { items, itemCount } = useCart();
  const { pathname } = useLocation();

  /**
   * The products that have already landed, starting with those here when the page opened. A picture only plays its landing
   * once, or every reload would drop the whole cart into the tray again. A ref, because changing it needs no redraw.
   */
  const landed = useRef(new Set(items.map((item) => item.productId)));

  // A product taken out of the cart is forgotten, so it lands again if it comes back.
  useEffect(() => {
    const inCart = new Set(items.map((item) => item.productId));
    for (const id of landed.current) {
      if (!inCart.has(id)) {
        landed.current.delete(id);
      }
    }
  }, [items]);

  // Not on Checkout. Going from one step to the next shortens the form, which slid the tray under the pointer, so the
  // second click of a double click opened the cart and lost what had been typed. A checkout needs no exit here anyway.
  if (slot === null || pathname === "/checkout") {
    return null;
  }

  return createPortal(
    <nav aria-label="Pickup tray" className="h-full">
      <Link to="/cart" className="pickup-tray">
        <span className="pickup-tray-items">
          {/* Each picture has a stable key, so adding a product mounts one new image and leaves the others alone. */}
          {items
            .slice(-MOST_SHOWN)
            .reverse()
            .map((item) => (
              <img
                key={item.productId}
                src={item.thumbnail}
                alt=""
                width={62}
                height={62}
                loading="lazy"
                className={landed.current.has(item.productId) ? undefined : "is-landing"}
                onAnimationEnd={(event) => {
                  landed.current.add(item.productId);
                  event.currentTarget.classList.remove("is-landing");
                }}
              />
            ))}
        </span>
        <span className="pickup-tray-label">
          <b aria-hidden="true" lang="ja">
            取出口
          </b>
          {/* Hidden words around the visible ones, because a link's spoken name has to include what people can see. */}
          <span className="sr-only">Pickup tray: </span>
          {itemCount === 1 ? "1 item in the tray" : `${itemCount} items in the tray`}
          <span className="sr-only">. Open cart</span>
        </span>
      </Link>
    </nav>,
    slot,
  );
}
