/**
 * NOTE: the small parts that show a product's price and stock: the LED price panel and two badges.
 * Why it exists: the catalog card and the product page must show these identically (PRD P2.3, P3.3).
 * Connects to: `ProductCard` and `ProductPage`. All rules come from `constants.ts`.
 */
import { LOW_STOCK_LIMIT, MIN_DISCOUNT_BADGE_PERCENT } from "@/utils/constants";
import { discountedPrice, formatPrice } from "@/utils/format";

interface PriceBlockProps {
  price: number;
  discountPercentage: number;
  /** Larger type, for the product page. */
  large?: boolean;
  className?: string;
}

/**
 * The amber LED panel, with the price after discount and the old price struck through above it. The old
 * price's row is always there, even when empty, so all the cards in a row stay the same height.
 * Amber on a dark panel in both themes: amber on white would be about 1.8:1, far below readable contrast.
 */
export function PriceBlock({ price, discountPercentage, large = false, className = "" }: PriceBlockProps) {
  const showOldPrice = discountPercentage >= MIN_DISCOUNT_BADGE_PERCENT;

  return (
    <div className={`bg-led-panel shadow-[inset_0_1px_0_#000] ${large ? "rounded-md px-3.5 py-2.5" : "px-2.5 pt-1.5 pb-1"} ${className}`}>
      <s className={`block text-led-soft ${large ? "h-5 text-sm leading-5" : "h-[18px] text-[13px] leading-[18px]"}`}>
        {showOldPrice ? formatPrice(price) : ""}
      </s>
      <span className={`led-text block leading-[1.15] tracking-[-0.01em] whitespace-nowrap [text-shadow:0_0_10px_rgb(255_182_39/0.35)] ${large ? "text-[42px]" : "text-2xl tablet:text-[27px]"}`}>
        {formatPrice(discountedPrice(price, discountPercentage))}
      </span>
    </div>
  );
}

/** The green "−9%" sticker. Hidden below 1%, as the PRD says. Math.round keeps it a whole number. */
export function DiscountBadge({ discountPercentage }: { discountPercentage: number }) {
  if (discountPercentage < MIN_DISCOUNT_BADGE_PERCENT) {
    return null;
  }
  return (
    <span className="pointer-events-none absolute top-2 right-2 z-[2] rounded-[3px] bg-discount px-[7px] py-px text-[13px] font-bold text-on-discount">
      −{Math.round(discountPercentage)}%
    </span>
  );
}

/**
 * The stock status, with the PRD's exact wording and colours. Text and colour both carry the meaning, so
 * it still works for someone who can't tell the colours apart. Orange gets a filled badge with dark text,
 * which keeps it distinct from the amber prices.
 */
export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return <span className="rounded-[3px] bg-sold-out px-[7px] py-px font-bold text-white">Out of stock</span>;
  }
  if (stock <= LOW_STOCK_LIMIT) {
    return <span className="rounded-[3px] bg-low-stock px-[7px] py-px font-bold text-on-low-stock">Only {stock} left!</span>;
  }
  return <span className="text-ink-soft">In stock</span>;
}
