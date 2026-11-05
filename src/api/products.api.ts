/**
 * NOTE: the API path for a single product.
 * Why it exists: pages shouldn't know URLs. If the API changes, only this file does.
 * Connects to: `ProductPage` passes this path to `useFetch`. The catalog's paths come from `utils/url.ts`.
 */

/** One product. */
export function productPath(id: number): string {
  return `/products/${id}`;
}
