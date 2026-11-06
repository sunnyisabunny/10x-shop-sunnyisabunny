/**
 * NOTE: the products saved with a heart (BONUS).
 * Why it exists: a place to come back to. It reuses `ProductGrid` and `ProductCard` as they are, which is the
 * composition the PRD asks for: one card, used on three different pages.
 * Connects to: `WishlistContext`. It asks the API for nothing, because the context already holds the card data.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import ProductGrid from "@/components/product/ProductGrid";
import { buttonStyles } from "@/components/ui/Button";
import StateMessage from "@/components/ui/StateMessage";
import { useWishlist } from "@/context/WishlistContext";
import { formatItemCount } from "@/utils/format";

export default function WishlistPage() {
  const { items } = useWishlist();

  /** The page heading, so keyboard focus has somewhere sensible to go when a card is removed. */
  const headingRef = useRef<HTMLHeadingElement>(null);

  /** How many there were at the last draw. A ref, because remembering it needs no redraw. */
  const previousCount = useRef(items.length);

  // Pressing a heart here removes its card, and the focused button with it. Focus would fall out of the page, leaving
  // keyboard users to Tab through everything again, so it moves to the heading instead.
  useEffect(() => {
    if (items.length < previousCount.current) {
      headingRef.current?.focus();
    }
    previousCount.current = items.length;
  }, [items.length]);

  return (
    <section className="grid gap-3.5 p-2.5 tablet:px-6 tablet:pt-5 tablet:pb-6">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-1 tablet:px-0">
        {/* tabIndex -1 lets code focus the heading without adding it to the Tab order. */}
        <h1 ref={headingRef} tabIndex={-1} className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">
          Wishlist
        </h1>
        {items.length > 0 && <span className="text-ink-soft">{formatItemCount(items.length)}</span>}
      </div>

      {items.length === 0 ? (
        <StateMessage title="Your wishlist is empty. Press the heart on any product to save it here.">
          <Link to="/" className={buttonStyles.primary}>
            Browse products
          </Link>
        </StateMessage>
      ) : (
        <ProductGrid products={items} />
      )}
    </section>
  );
}
