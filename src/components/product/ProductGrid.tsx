/**
 * NOTE: draws a list of products as the machine's window of slots, or empty slots while they load.
 * Why it exists: PRD P2.3 asks for `map()` with a stable key, and the grid's columns live here once.
 * Connects to: `CatalogPage` passes it the products, and it draws one `ProductCard` for each.
 */
import { useAddToCart } from "../../hooks/useAddToCart";
import type { Product } from "../../types/product";
import { PAGE_SIZE } from "../../utils/constants";
import { slotCode } from "../../utils/format";
import ProductCard from "./ProductCard";

/** Columns per the spec: 1 on a phone, 2-3 on a tablet, 4 on desktop. Shared so skeletons match the real grid. */
const gridColumns = "grid grid-cols-1 gap-2 tablet:grid-cols-2 tablet:gap-3 md:grid-cols-3 desktop:grid-cols-4";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const addToCart = useAddToCart();

  return (
    <div className="machine-window">
      <div className={gridColumns}>
        {products.map((product, index) => (
          // The key is the product's id, not its index. React uses keys to match items between renders;
          // with an index, reordering the list would make it reuse the wrong card.
          <ProductCard key={product.id} product={product} code={slotCode(index)} onAdd={addToCart} />
        ))}
      </div>
    </div>
  );
}

/**
 * Placeholder slots while products load (PRD P2.2). They are the same size as real cards, so the page
 * doesn't jump when the data arrives. That jump is what Lighthouse measures as layout shift (CLS).
 * Screen readers skip the shapes and hear the hidden "Loading products…" text instead.
 */
export function ProductGridSkeleton() {
  return (
    <div role="status" className="machine-window">
      <span className="sr-only">Loading products…</span>
      <div aria-hidden="true" className={gridColumns}>
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          <div key={index} className="flex animate-pulse flex-col overflow-hidden rounded-lg bg-shelf shadow-[inset_0_0_0_1px_var(--edge)]">
            <div className="dim-glass aspect-[1/0.82] max-tablet:aspect-[1/0.5]" />
            <div className="h-[62px] bg-led-panel" />
            <div className="grid gap-2 p-3">
              <div className="h-4 w-3/4 rounded bg-edge" />
              <div className="h-3 w-1/2 rounded bg-edge" />
              <div className="mt-2 h-11 rounded-md bg-edge" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
