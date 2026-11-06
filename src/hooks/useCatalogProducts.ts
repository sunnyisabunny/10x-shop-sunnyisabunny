/**
 * NOTE: loads what the catalog shows, whichever way it has to (BONUS for the price part).
 * Why it exists: the API can't filter by price, so with a price range the filtering has to happen here. `CatalogPage`
 * shouldn't need to know that, so both cases come out in exactly the same shape.
 * Connects to: `useFetch` does the request, `utils/url.ts` builds the paths, and `CatalogPage` reads the result.
 *
 * The usual case asks the API for one page at a time, as the PRD requires. A price range is the one exception: it
 * fetches the whole current list, with only the card fields, which is about 7 kB compressed for all 194 products. After
 * that, changing the range or the page needs no request. A new search, category or sort does, because those change
 * what the list is. `REPORT.md` discloses this.
 */
import { useMemo } from "react";
import type { ProductSummary, ProductsResponse } from "../types/product";
import { PAGE_SIZE } from "../utils/constants";
import { discountedPrice } from "../utils/format";
import { buildFullListUrl, buildProductsUrl, hasPriceRange, type CatalogParams } from "../utils/url";
import { useFetch, type UseFetchResult } from "./useFetch";

/** Picks the products in the range and cuts out one page. It filters on the price shown, after discount. */
function pageOfMatches(products: ProductSummary[], min: number | null, max: number | null, page: number): ProductsResponse<ProductSummary> {
  const matching = products.filter((product) => {
    const price = discountedPrice(product.price, product.discountPercentage);
    return (min === null || price >= min) && (max === null || price <= max);
  });
  const skip = (page - 1) * PAGE_SIZE;
  return { products: matching.slice(skip, skip + PAGE_SIZE), total: matching.length, skip, limit: PAGE_SIZE };
}

/** Returns the same `{ state, retry }` as `useFetch`, so the page draws both cases with the same code. */
export function useCatalogProducts(params: CatalogParams): UseFetchResult<ProductsResponse<ProductSummary>> {
  const filtering = hasPriceRange(params);
  const { min, max, page } = params;

  // The path has no range or page in it, so changing those keeps the list already loaded.
  const { state, retry } = useFetch<ProductsResponse<ProductSummary>>(filtering ? buildFullListUrl(params) : buildProductsUrl(params));

  /**
   * `useMemo`, because this page redraws often and the filter walks up to 194 products each time. It depends on the
   * three values it uses and not on `params`, or switching to list view would redo the work and redraw every card.
   */
  const shown = useMemo(() => {
    if (!filtering || state.status !== "success") {
      return state;
    }
    return { status: "success" as const, data: pageOfMatches(state.data.products, min, max, page) };
  }, [filtering, state, min, max, page]);

  return { state: shown, retry };
}
