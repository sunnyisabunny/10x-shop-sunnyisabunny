/**
 * NOTE: draws a list of products as the machine's window of slots, or empty slots while they load.
 * Why it exists: PRD P2.3 asks for `map()` with a stable key, and the grid's columns live here once.
 * Connects to: `CatalogPage` passes it the products, and it draws one `ProductCard` for each.
 */
import { useLocation } from "react-router";
import { useAddToCart } from "../../hooks/useAddToCart";
import type { ProductSummary } from "../../types/product";
import { PAGE_SIZE } from "../../utils/constants";
import { slotCode } from "../../utils/format";
import type { CatalogView } from "../../utils/url";
import ProductCard from "./ProductCard";

/**
 * Columns per the spec: 1 on a phone, 2-3 on a tablet, 4 on desktop. List view is one column everywhere. Shared so
 * skeletons match the real grid.
 */
const columns = {
  grid: "grid grid-cols-1 gap-2 tablet:grid-cols-2 tablet:gap-3 md:grid-cols-3 desktop:grid-cols-4",
  list: "grid grid-cols-1 gap-2 tablet:gap-3",
};

interface ProductGridProps {
  products: ProductSummary[];
  /** Grid unless the catalog says otherwise. Related products always use the grid. */
  view?: CatalogView;
}

export default function ProductGrid({ products, view = "grid" }: ProductGridProps) {
  const addToCart = useAddToCart();

  /** Read here and passed down as a plain true or false, so a URL change can't get through the cards' `memo`. */
  const { pathname } = useLocation();

  return (
    <div className="machine-window">
      <div className={columns[view]}>
        {products.map((product, index) => (
          // The key is the product's id, not its index. React uses keys to match items between renders;
          // with an index, reordering the list would make it reuse the wrong card.
          <ProductCard key={product.id} product={product} code={slotCode(index)} onAdd={addToCart} view={view} fromCatalog={pathname === "/"} />
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
export function ProductGridSkeleton({ view = "grid" }: { view?: CatalogView }) {
  return (
    <div role="status" className="machine-window">
      <span className="sr-only">Loading products…</span>
      <div aria-hidden="true" className={columns[view]}>
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          <div key={index} className={`flex animate-pulse overflow-hidden rounded-lg bg-shelf shadow-[inset_0_0_0_1px_var(--edge)] ${view === "grid" ? "flex-col" : "h-[136px]"}`}>
            <div className={`dim-glass ${view === "grid" ? "aspect-[1/0.82] max-tablet:aspect-[1/0.5]" : "w-[124px] tablet:w-[168px]"}`} />
            <div className="flex-1">
              <div className="h-[62px] bg-led-panel" />
              <div className="grid gap-2 p-3">
                <div className="h-4 w-3/4 rounded bg-edge" />
                <div className="h-3 w-1/2 rounded bg-edge" />
                {view === "grid" && <div className="mt-2 h-11 rounded-md bg-edge" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
