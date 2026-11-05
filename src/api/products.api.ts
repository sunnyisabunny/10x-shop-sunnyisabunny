/**
 * NOTE: the functions that talk to the DummyJSON API.
 * Why it exists: pages shouldn't know URLs or how `fetch` behaves. If the API changes, only this file does.
 * Connects to: `CatalogPage` calls `fetchProducts`, and `ProductPage` calls `fetchProduct`.
 *
 * `fetch` only rejects when the network fails. A 404 or 500 still resolves normally with `ok: false`,
 * so every function has to check `response.ok` itself, or an error page would be treated as data.
 */
import type { Product, ProductsResponse } from "../types/product";
import { API_BASE_URL, PAGE_SIZE } from "../utils/constants";

/** Gets one page of products. `skip` is how many to jump over, so page 2 is skip = 12. */
export async function fetchProducts(skip = 0): Promise<ProductsResponse> {
  const response = await fetch(`${API_BASE_URL}/products?limit=${PAGE_SIZE}&skip=${skip}`);
  if (!response.ok) {
    throw new Error(`The product list request failed with status ${response.status}.`);
  }
  return response.json();
}

/**
 * Gets one product. It returns null for a 404, since "that product doesn't exist" is a normal answer the
 * page shows as NotFound. Any other failure is a real error and throws.
 */
export async function fetchProduct(id: number): Promise<Product | null> {
  const response = await fetch(`${API_BASE_URL}/products/${id}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`The product request failed with status ${response.status}.`);
  }
  return response.json();
}
