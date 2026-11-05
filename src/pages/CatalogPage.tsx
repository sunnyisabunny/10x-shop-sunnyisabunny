/**
 * NOTE: the Catalog page: gets products from the API and shows them (PRD P2).
 * Why it exists: this is the shop's front page, and the first thing a visitor sees.
 * Connects to: `useFetch` (data), `ProductGrid` (drawing), `StateMessage` (the other states).
 *
 * The data flow to remember: mount -> useFetch's effect runs -> fetch -> setState -> React redraws. Which of
 * skeleton, error, empty or grid appears is decided by `state.status` below ("conditional rendering").
 */
import { productsPath } from "../api/products.api";
import ProductGrid, { ProductGridSkeleton } from "../components/product/ProductGrid";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import { useFetch } from "../hooks/useFetch";
import type { ProductsResponse } from "../types/product";

export default function CatalogPage() {
  const { state, retry } = useFetch<ProductsResponse>(productsPath());

  return (
    <section className="grid gap-3.5 p-2.5 tablet:px-6 tablet:pt-5 tablet:pb-4">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-1 tablet:px-0">
        <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Catalog</h1>
        {state.status === "success" && <span className="text-ink-soft">{state.data.total} items</span>}
      </div>

      {state.status === "loading" && <ProductGridSkeleton />}
      {state.status === "error" && (
        <StateMessage title={state.message} role="alert">
          <Button variant="quiet" onClick={retry}>
            Retry
          </Button>
        </StateMessage>
      )}
      {/* TypeScript only allows `state.data` inside this check, so it can't be read before it exists. */}
      {state.status === "success" &&
        (state.data.products.length === 0 ? <StateMessage title="No products found." /> : <ProductGrid products={state.data.products} />)}
    </section>
  );
}
