/**
 * NOTE: the catalog's lower half: skeleton, error, empty message, or the grid with its page buttons or Endless footer.
 * Why it exists: all the "which state are we in" logic sits here, so `CatalogPage` stays a short overview.
 * Connects to: `CatalogPage` passes the loaded state. `ProductGrid`, `Pagination` and `EndlessFooter` do the drawing.
 */
import { Link } from "react-router";
import type { EndlessControls } from "../../hooks/useEndlessProducts";
import type { AsyncState } from "../../types/api";
import type { ProductSummary, ProductsResponse } from "../../types/product";
import { PAGE_SIZE } from "../../utils/constants";
import { clearedFiltersPath, type CatalogView } from "../../utils/url";
import Button, { buttonStyles } from "../ui/Button";
import StateMessage from "../ui/StateMessage";
import EndlessFooter from "./EndlessFooter";
import Pagination from "./Pagination";
import ProductGrid, { ProductGridSkeleton } from "./ProductGrid";

interface CatalogResultsProps {
  state: AsyncState<ProductsResponse<ProductSummary>>;
  page: number;
  view: CatalogView;
  /** The Endless controls, or null in Pages. */
  endless: EndlessControls | null;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onBackToTop: () => void;
}

export default function CatalogResults({ state, page, view, endless, onRetry, onPageChange, onBackToTop }: CatalogResultsProps) {
  if (state.status === "idle" || state.status === "loading") {
    return <ProductGridSkeleton view={view} />;
  }

  if (state.status === "error") {
    return (
      <StateMessage title={state.message} role="alert">
        <Button variant="quiet" onClick={onRetry}>
          Retry
        </Button>
      </StateMessage>
    );
  }

  const { products, total } = state.data;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Products exist but not on this page, as with an old link to ?page=99. "No products found" would be false.
  if (products.length === 0 && total > 0) {
    return (
      <StateMessage title={`This page is past the end of the list. ${totalPages === 1 ? "There is 1 page." : `There are ${totalPages} pages.`}`}>
        <Button variant="quiet" onClick={() => onPageChange(totalPages)}>
          Go to the last page
        </Button>
      </StateMessage>
    );
  }

  if (products.length === 0) {
    return (
      <StateMessage title="No products found.">
        {/* Linking without the filters empties them, because the URL is the only place they live. */}
        <Link to={clearedFiltersPath({ view, mode: endless === null ? "pages" : "endless" })} className={buttonStyles.quiet}>
          Clear filters
        </Link>
      </StateMessage>
    );
  }

  const firstShown = (page - 1) * PAGE_SIZE + 1;
  const lastShown = firstShown + products.length - 1;

  return (
    <>
      <ProductGrid products={products} view={view} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-1 tablet:px-0">
        {/* In Endless, `aria-live` is how a screen reader hears that more products have arrived. */}
        <span aria-live={endless === null ? undefined : "polite"} className="text-ink-soft">
          Showing {firstShown}–{lastShown} of {total}
        </span>
        {endless === null && totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />}
      </div>
      {endless !== null && <EndlessFooter more={endless.more} shown={products.length} onLoadMore={endless.loadMore} onRetry={onRetry} onBackToTop={onBackToTop} />}
    </>
  );
}
