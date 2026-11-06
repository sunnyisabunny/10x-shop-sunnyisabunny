/**
 * NOTE: when a product is added, its picture falls out of its slot and down into the pickup tray (beyond the spec).
 * Why it exists: this is the one longer moment of motion in the shop, and it answers something the visitor just did.
 * Connects to: `ExtrasHost` draws this. It watches the cart and nothing calls it, so Add to cart works the same without it.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/types/cart";
import { playSound } from "./sound/SoundToggle";

/** One falling picture: what it shows, where it starts and how far it goes. */
interface Fall {
  /** A new key each time, so a second add restarts the animation rather than leaving the first one running. */
  key: number;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  distance: number;
}

/** How many of each product are in the cart, by product id. */
function quantities(items: CartItem[]): Map<number, number> {
  return new Map(items.map((item) => [item.productId, item.quantity]));
}

/** The picture to drop: the big one on the product's own page, or its card's in a list. There may not be one on the screen. */
function findPicture(productId: number): HTMLImageElement | null {
  if (window.location.pathname === `/products/${productId}`) {
    return document.querySelector<HTMLImageElement>("main img");
  }
  const link = document.querySelector(`[data-slot] a[href="/products/${productId}"]`);
  return link?.closest("[data-slot]")?.querySelector("img") ?? null;
}

/** Works out the fall. It lands in the tray if the tray is on the screen, and otherwise leaves through the bottom of it. */
function fallFrom(picture: HTMLImageElement): Fall {
  const start = picture.getBoundingClientRect();
  const trayTop = document.getElementById("tray-slot")?.getBoundingClientRect().top ?? Infinity;
  const landing = trayTop < window.innerHeight ? trayTop + 16 : window.innerHeight + 40;
  return { key: Date.now(), src: picture.currentSrc, left: start.left, top: start.top, width: start.width, height: start.height, distance: landing - start.top };
}

export default function ItemDrop() {
  const { items } = useCart();

  /** The picture falling right now, or null. */
  const [fall, setFall] = useState<Fall | null>(null);

  /** The quantities last seen. Comparing with them is how this tells what just changed. A ref, because it needs no redraw. */
  const lastSeen = useRef(quantities(items));

  // Looks for one product whose quantity went up. Reorder adds several at once, and that isn't one thing falling, so it
  // stays still. So does the Cart page's + button, because no slot is on screen there to fall from. Anyone who asks for
  // less motion still hears the drop if sound is on.
  useEffect(() => {
    const before = lastSeen.current;
    lastSeen.current = quantities(items);
    const added = items.filter((item) => item.quantity > (before.get(item.productId) ?? 0));
    if (added.length !== 1) {
      return;
    }
    const picture = findPicture(added[0].productId);
    if (picture === null) {
      return;
    }
    playSound("drop");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFall(fallFrom(picture));
    }
  }, [items]);

  if (fall === null) {
    return null;
  }

  return createPortal(
    // Fixed to the screen and outside the page, so nothing clips it and it can't move anything around it. The ref passes
    // the distance to the CSS animation as `--fall`, because the `style` prop's type has no room for custom properties.
    <img
      key={fall.key}
      ref={(image) => image?.style.setProperty("--fall", `${fall.distance}px`)}
      src={fall.src}
      alt=""
      aria-hidden="true"
      className="item-fall"
      style={{ left: fall.left, top: fall.top, width: fall.width, height: fall.height }}
      onAnimationEnd={() => setFall(null)}
    />,
    document.body,
  );
}
