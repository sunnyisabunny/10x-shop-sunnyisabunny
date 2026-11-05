/**
 * NOTE: the Catalog page: search, filter, sort and browse products (PRD P2).
 * Why it exists: this is the shop's front page, and the first thing a visitor sees.
 * Connects to: `useCatalogParams` (the URL), `useFetch` (data), `CatalogToolbar` and `CatalogResults` (drawing).
 *
 * The URL is the single source of truth. A change goes: control -> URL -> `params` -> API path -> new data.
 * That is why refresh, Back/Forward and shared links all restore the same view with no extra code.
 */
import CatalogResults from "../components/product/CatalogResults";
import CatalogToolbar from "../components/product/CatalogToolbar";
import { useCatalogParams } from "../hooks/useCatalogParams";
import { useFetch } from "../hooks/useFetch";
import type { ProductsResponse } from "../types/product";
import { buildProductsUrl } from "../utils/url";

export default function CatalogPage() {
  const { params, change } = useCatalogParams();

  // The path comes from the URL, so a new filter means a new path, and useFetch cancels the old
  // request and starts the new one by itself.
  const { state, retry } = useFetch<ProductsResponse>(buildProductsUrl(params));

  /** PRD P2 element 6: changing page also returns to the top, since the new products start there. */
  function handlePageChange(page: number) {
    change({ type: "page", page });
    window.scrollTo(0, 0);
  }

  // The caption's reason: the API sorts by list price, but cards show the price after discount, so a price
  // sort can look slightly out of order. Saying so is more honest than re-sorting one page in the browser.
  const isPriceSort = params.sort === "price-asc" || params.sort === "price-desc";

  return (
    <section className="grid gap-3.5 p-2.5 tablet:px-6 tablet:pt-5 tablet:pb-4">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-1 tablet:px-0">
        <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Catalog</h1>
        {state.status === "success" && <span className="text-ink-soft">{state.data.total} items</span>}
      </div>

      <div className="px-1 tablet:px-0">
        <CatalogToolbar params={params} onChange={change} />
        {isPriceSort && <p className="mt-2 text-[13px] text-ink-soft">Sorted by list price, before discount.</p>}
      </div>

      <CatalogResults state={state} page={params.page} onRetry={retry} onPageChange={handlePageChange} />
    </section>
  );
}
