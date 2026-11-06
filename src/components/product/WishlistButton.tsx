/**
 * NOTE: the heart that saves a product to the wishlist (BONUS).
 * Why it exists: the cards and the product page do the same thing, in two different shapes.
 * Connects to: `WishlistContext`. Because this component reads the context itself, adding to the wishlist redraws the
 * hearts only, and `memo(ProductCard)` still keeps the cards from redrawing.
 */
import { useWishlist } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import type { ProductSummary } from "../../types/product";

interface WishlistButtonProps {
  product: ProductSummary;
  /** True on the product page, which has room for words beside the heart. */
  labelled?: boolean;
}

export default function WishlistButton({ product, labelled = false }: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
  const { showToast } = useToast();
  const isSaved = has(product.id);

  /** The message says what really happened, including when storage refused. */
  function handleClick() {
    if (!toggle(product)) {
      showToast("Your wishlist could not be saved. Browser storage is full or blocked.");
    } else {
      showToast(isSaved ? "Removed from wishlist" : "Added to wishlist ♥");
    }
  }

  const heart = (
    <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill={isSaved ? "currentColor" : "none"} aria-hidden="true">
      <path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.3 3.8 4 7.2 4c2 0 3.7 1.1 4.8 3 1.1-1.9 2.8-3 4.8-3 3.4 0 5.5 3.3 4.4 6.7C19.5 15.4 12 20 12 20z" />
    </svg>
  );

  if (labelled) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex min-h-11 items-center gap-2 rounded-md bg-steel-raised px-3.5 font-semibold shadow-[inset_0_0_0_1px_var(--edge-bright)] transition-colors duration-150 hocus:bg-edge ${isSaved ? "text-pink" : "text-ink"}`}
      >
        {heart}
        {/* The words already say the state, so this one has no `aria-pressed`, which would make screen readers say it twice. */}
        <span className="text-ink">{isSaved ? "In your wishlist" : "Add to wishlist"}</span>
      </button>
    );
  }

  return (
    // z-[2] lifts it above the card's stretched link, so pressing the heart doesn't open the product. The button is the
    // 44px tap target, and the smaller pale circle inside keeps the heart visible over a dark product. `right-1` leaves
    // just enough room for the focus ring, which the card's rounded corners would otherwise cut off.
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={`Wishlist: ${product.title}`}
      className="absolute right-1 bottom-2 z-[2] inline-flex size-11 items-center justify-center text-[#10141d] transition-colors duration-150 hocus:text-pink aria-pressed:text-pink"
    >
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/80">{heart}</span>
    </button>
  );
}
