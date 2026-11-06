/**
 * NOTE: up to four other products from the same category (PRD P3.5).
 * Why it exists: the shop's way of saying "you might also want". It reuses `ProductGrid` and `ProductCard`,
 * which is the PRD's main evidence of composition.
 * Connects to: `ProductPage`. It loads its own data, so a failure here can't take down the product itself.
 */
import { useFetch } from "@/hooks/useFetch";
import type { ProductsResponse } from "@/types/product";
import { RELATED_FETCH_LIMIT, RELATED_SHOW_LIMIT } from "@/utils/constants";
import ProductGrid from "./ProductGrid";

interface RelatedProductsProps {
  category: string;
  /** The product being viewed, left out of its own suggestions. */
  productId: number;
}

export default function RelatedProducts({ category, productId }: RelatedProductsProps) {
  const { state } = useFetch<ProductsResponse>(`/products/category/${encodeURIComponent(category)}?limit=${RELATED_FETCH_LIMIT}`);

  // Suggestions are optional extras. Loading or failing shows nothing, so the product page stays clean.
  if (state.status !== "success") {
    return null;
  }

  const related = state.data.products.filter((product) => product.id !== productId).slice(0, RELATED_SHOW_LIMIT);
  if (related.length === 0) {
    return null;
  }

  return (
    <section className="mt-7" aria-labelledby="related-heading">
      <h2 id="related-heading" className="mb-3 text-[22px] font-bold">
        Related products
      </h2>
      <ProductGrid products={related} />
    </section>
  );
}
