/**
 * NOTE: the shape of product data from the DummyJSON API.
 * Why it exists: TypeScript can only catch a mistake like `product.prize` if it knows the real shape.
 * Connects to: `api/products.api.ts` (fills these), and the cards and pages (read them).
 *
 * My rule for `interface` vs `type`, which the PRD says I'll be asked about: an object's shape that
 * could be extended uses `interface`. A union, an intersection or an alias uses `type`.
 */

/** One product, exactly as `GET /products/{id}` returns the fields this app uses. */
export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  /** Optional because 92 of the 194 products really have no brand. */
  brand?: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  thumbnail: string;
  images: string[];
}

/** One entry from `GET /products/categories`. `slug` goes in URLs, `name` is what people read. */
export interface Category {
  slug: string;
  name: string;
  url: string;
}

/** The API's list envelope. `total` is how many exist, not how many came back in `products`. */
export interface ProductsResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}
