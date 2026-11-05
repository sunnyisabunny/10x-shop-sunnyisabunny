/**
 * NOTE: draws a list of products as the machine's window of slots.
 * Why it exists: PRD P2.3 asks for `map()` with a stable key, and the grid's columns live here once.
 * Connects to: `CatalogPage` passes it the products, and it draws one `ProductCard` for each.
 */
import type { Product } from "../../types/product";
import { slotCode } from "../../utils/format";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="machine-window">
      {/* Columns per the spec: 1 on a phone, 2-3 on a tablet, 4 on desktop. */}
      <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2 tablet:gap-3 md:grid-cols-3 desktop:grid-cols-4">
        {products.map((product, index) => (
          // The key is the product's id, not its index. React uses keys to match items between renders;
          // with an index, reordering the list would make it reuse the wrong card.
          <ProductCard key={product.id} product={product} code={slotCode(index)} />
        ))}
      </div>
    </div>
  );
}
