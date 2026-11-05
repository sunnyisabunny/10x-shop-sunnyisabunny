/**
 * NOTE: one product, drawn as one slot of the vending machine (PRD P2.3).
 * Why it exists: the same card is needed in the catalog, in related products and on the wishlist. Reusing
 * one component is the PRD's main evidence of composition.
 * Connects to: `ProductGrid` draws one per product. `PriceBlock` supplies the price and badges.
 *
 * On a phone the card is a sideways shelf row (grid areas). From tablet width up it stacks vertically.
 */
import { Link, useLocation } from "react-router";
import type { Product } from "../../types/product";
import { formatCategory } from "../../utils/format";
import Button from "../ui/Button";
import { DiscountBadge, PriceBlock, StockBadge } from "./PriceBlock";

/** The props are an interface, as the PRD asks: every component's inputs are named and typed. */
export interface ProductCardProps {
  product: Product;
  /** The machine's label for this position, such as "B3". */
  code: string;
  /** A callback prop: the card only reports the press, and the parent decides what adding means. */
  onAdd: (product: Product) => void;
}

export default function ProductCard({ product, code, onAdd }: ProductCardProps) {
  const isOut = product.stock === 0;

  /** Where this card is. The product page uses it to know whether "Back to catalog" can just go back. */
  const { pathname } = useLocation();

  // 92 products have no brand. Without this check they would show a dangling "Groceries · ".
  const subtitle = product.brand ? `${formatCategory(product.category)} · ${product.brand}` : formatCategory(product.category);

  return (
    <article
      data-slot={code}
      className="relative grid min-w-0 grid-cols-[124px_minmax(0,1fr)] overflow-hidden rounded-lg bg-shelf shadow-[inset_0_0_0_1px_var(--edge)] transition-shadow duration-150 [grid-template-areas:'bay_led'_'bay_meta'] hover:shadow-[inset_0_0_0_1px_var(--edge-bright),0_0_0_1px_var(--edge-bright)] tablet:flex tablet:flex-col"
    >
      <div
        className={`${isOut ? "dim-glass" : "lit-glass"} relative flex min-h-[136px] items-end justify-center overflow-hidden [grid-area:bay] tablet:aspect-[1/0.82] tablet:min-h-0`}
      >
        {/* pointer-events-none on these labels lets a click reach the stretched link underneath. Without
            it, clicking the slot code, the discount or the sold-out lamp would do nothing. */}
        <span className="led-text pointer-events-none absolute top-2 left-2 z-[2] rounded-[3px] bg-[#10141d] px-1.5 text-[15px] leading-[1.45] text-[#f2f5fa]">
          {code}
        </span>
        <DiscountBadge discountPercentage={product.discountPercentage} />
        {isOut && (
          // The red lamp real Japanese machines light up: 売切 means "sold out". Decoration only, so
          // screen readers skip it and hear the required "Out of stock" text from the stock badge.
          <span
            aria-hidden="true"
            lang="ja"
            className="pointer-events-none absolute top-[42%] left-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 -rotate-[7deg] rounded bg-sold-out px-2.5 py-0.5 font-dot text-2xl leading-[1.2] text-white shadow-[0_0_18px_rgb(212_21_42/0.65)]"
          >
            売切
          </span>
        )}
        {/* width and height reserve the space before the image loads, so the page doesn't jump (CLS).
            loading="lazy" means images below the fold only download when they get close. */}
        <img
          src={product.thumbnail}
          alt={product.title}
          width={300}
          height={300}
          loading="lazy"
          className={`relative z-[1] mb-1.5 aspect-square h-auto w-[88%] object-contain tablet:w-[78%] ${isOut ? "opacity-75 contrast-75 grayscale" : ""}`}
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-[14%] bottom-1.5 h-4 rounded-[50%] bg-[radial-gradient(closest-side,rgb(20_30_45/0.42),transparent)]"
        />
      </div>

      <PriceBlock price={product.price} discountPercentage={product.discountPercentage} className="[grid-area:led]" />

      <div className="flex min-w-0 flex-1 flex-col gap-[3px] px-2.5 pt-2 pb-3 [grid-area:meta] tablet:px-3 tablet:pt-2.5">
        {/* The ::after layer stretches this link over the whole card, so the card is clickable while it
            is still a real link for keyboards. A click handler on the <article> would not be. */}
        <Link
          to={`/products/${product.id}`}
          state={{ fromCatalog: pathname === "/" }}
          className="line-clamp-2 text-[15px] leading-[1.4] font-semibold text-ink no-underline after:absolute after:inset-0 after:z-[1] hover:underline tablet:min-h-[2.8em]"
        >
          {product.title}
        </Link>
        <span className="truncate text-[13px] text-ink-soft">{subtitle}</span>
        <div className="mt-[3px] flex min-h-6 items-center justify-between gap-2 text-[13px]">
          {/* rating.toFixed(1) shows one decimal, as in the PRD's "★ 4.7". */}
          <span className="font-semibold text-ink">★ {product.rating.toFixed(1)}</span>
          <StockBadge stock={product.stock} />
        </div>
      </div>

      {/* relative + z-[2] lifts the button above the card's stretched link, so pressing it adds to the
          cart rather than opening the product. */}
      <Button
        disabled={isOut}
        onClick={() => onAdd(product)}
        className="relative z-[2] col-span-2 mx-2.5 mb-3 tablet:mx-3 tablet:mb-[13px]"
      >
        {isOut ? "Out of stock" : "Add to cart"}
      </Button>
    </article>
  );
}
