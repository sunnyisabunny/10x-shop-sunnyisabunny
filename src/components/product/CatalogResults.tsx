/**
 * NOTE: the catalog's lower half: skeleton, error, empty message, or the grid with its page buttons.
 * Why it exists: all the "which state are we in" logic sits here, so `CatalogPage` stays a short overview.
 * Connects to: `CatalogPage` passes the loaded state. `ProductGrid` and `Pagination` do the drawing.
 */
import { Link } from "react-router";
import type { AsyncState } from "../../types/api";
import type { ProductsResponse } from "../../types/product";
import { PAGE_SIZE } from "../../utils/constants";
import type { CatalogView } from "../../utils/url";
import Button, { buttonStyles } from "../ui/Button";
import StateMessage from "../ui/StateMessage";
import Pagination from "./Pagination";
import ProductGrid, { ProductGridSkeleton } from "./ProductGrid";

interface CatalogResultsProps {
  state: AsyncState<ProductsResponse>;
  page: number;
  view: CatalogView;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

export default function CatalogResults({ state, page, view, onRetry, onPageChange }: CatalogResultsProps) {
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
      <StateMessage title={`This page is past the end of the list. There are ${totalPages} pages.`}>
        <Button variant="quiet" onClick={() => onPageChange(totalPages)}>
          Go to the last page
        </Button>
      </StateMessage>
    );
  }

  if (products.length === 0) {
    return (
      <StateMessage title="No products found.">
        {/* Linking to the bare "/" empties the URL, and the URL is the only place filters live. The view isn't a
            filter, so list view stays on. */}
        <Link to={view === "list" ? "/?view=list" : "/"} className={buttonStyles.quiet}>
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
        <span className="text-ink-soft">
          Showing {firstShown}–{lastShown} of {total}
        </span>
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />}
      </div>
    </>
  );
}
