/**
 * NOTE: the API paths for products.
 * Why it exists: pages shouldn't know URLs. If the API changes, only this file does.
 * Connects to: `CatalogPage` and `ProductPage` pass these paths to `useFetch`.
 */
import { PAGE_SIZE } from "../utils/constants";

/** One page of products. `skip` is how many to jump over, so page 2 is skip = 12. */
export function productsPath(skip = 0): string {
  return `/products?limit=${PAGE_SIZE}&skip=${skip}`;
}

/** One product. */
export function productPath(id: number): string {
  return `/products/${id}`;
}
