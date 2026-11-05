/**
 * NOTE: the Catalog page: gets products from the API and shows them (PRD P2).
 * Why it exists: this is the shop's front page, and the first thing a visitor sees.
 * Connects to: `products.api.ts` (data), `ProductGrid` (drawing), `StateMessage` (the other states).
 *
 * The data flow to remember: mount -> useEffect runs -> fetch -> setState -> React redraws. Which of
 * loading, error, empty or the grid appears is decided by the `if`s below ("conditional rendering").
 */
import { useEffect, useState } from "react";
import { fetchProducts } from "../api/products.api";
import ProductGrid from "../components/product/ProductGrid";
import StateMessage from "../components/ui/StateMessage";
import type { Product } from "../types/product";

export default function CatalogPage() {
  /** The products from the API. Empty until the response arrives. */
  const [products, setProducts] = useState<Product[]>([]);

  /** How many products exist in total. The response has this, and the heading shows it. */
  const [total, setTotal] = useState(0);

  /** True while the request is running. Starts true because the request starts straight away. */
  const [isLoading, setIsLoading] = useState(true);

  /** The error text if the request failed, otherwise null. */
  const [error, setError] = useState<string | null>(null);

  // Fetches the products once when the page opens. The empty [] dependency list means "only on mount".
  useEffect(() => {
    // Set by the cleanup below. If you leave the page while the request runs, the answer is ignored
    // and doesn't update a page that's gone.
    let isCancelled = false;

    fetchProducts()
      .then((data) => {
        if (!isCancelled) {
          setProducts(data.products);
          setTotal(data.total);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Could not load the products. Check your connection and reload the page.");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <section className="grid gap-3.5 p-2.5 tablet:px-6 tablet:pt-5 tablet:pb-4">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-1 tablet:px-0">
        <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Catalog</h1>
        {!isLoading && !error && <span className="text-ink-soft">{total} items</span>}
      </div>

      {isLoading && <StateMessage title="Loading products…" />}
      {error && <StateMessage title={error} role="alert" />}
      {!isLoading && !error && products.length === 0 && <StateMessage title="No products found." />}
      {products.length > 0 && <ProductGrid products={products} />}
    </section>
  );
}
