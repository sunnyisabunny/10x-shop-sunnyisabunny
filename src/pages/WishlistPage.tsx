/**
 * NOTE: the products saved with a heart (BONUS).
 * Why it exists: a place to come back to. It reuses `ProductGrid` and `ProductCard` as they are, which is the
 * composition the PRD asks for: one card, used on three different pages.
 * Connects to: `WishlistContext`. It asks the API for nothing, because the context already holds the card data.
 */
import { Link } from "react-router";
import ProductGrid from "../components/product/ProductGrid";
import { buttonStyles } from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import { useWishlist } from "../context/WishlistContext";
import { formatItemCount } from "../utils/format";

export default function WishlistPage() {
  const { items } = useWishlist();

  return (
    <section className="grid gap-3.5 p-2.5 tablet:px-6 tablet:pt-5 tablet:pb-6">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-1 tablet:px-0">
        <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Wishlist</h1>
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
