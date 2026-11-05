/**
 * NOTE: the product page: one product in detail, with a quantity and Add to cart (PRD P3).
 * Why it exists: this is where someone decides to buy.
 * Connects to: `fetchProduct` (data), `Gallery` (photos), `PriceBlock` (price), `CartContext` (adding).
 */
import { useEffect, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { fetchProduct } from "../api/products.api";
import Gallery from "../components/product/Gallery";
import { PriceBlock, StockBadge } from "../components/product/PriceBlock";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import Stepper from "../components/ui/Stepper";
import { useCart } from "../context/CartContext";
import type { Product } from "../types/product";
import { formatCategory } from "../utils/format";
import NotFoundPage from "./NotFoundPage";

/** The product's details and controls. Split out so its quantity starts fresh for each product. */
function ProductDetails({ product }: { product: Product }) {
  const { addItem } = useCart();
  const isOut = product.stock === 0;

  /** How many to add. The Stepper keeps it between 1 and the stock. */
  const [quantity, setQuantity] = useState(1);

  /** The message under the button after pressing it. */
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleAdd() {
    const wasAdded = addItem(product, quantity);
    setFeedback(wasAdded ? "Added to cart ✓" : `Only ${product.stock} available. Some are already in your cart.`);
  }

  return (
    <div className="grid gap-5 desktop:grid-cols-2 desktop:gap-7">
      <Gallery title={product.title} images={product.images} discountPercentage={product.discountPercentage} />

      <div className="flex min-w-0 flex-col gap-3.5">
        <div>
          <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">{product.title}</h1>
          <p className="mt-1.5 text-ink-soft">
            {product.brand ? `${product.brand} · ` : ""}
            {formatCategory(product.category)}
          </p>
        </div>

        <PriceBlock large price={product.price} discountPercentage={product.discountPercentage} />

        <div className="flex flex-wrap items-center gap-3.5">
          <span className="font-semibold">★ {product.rating.toFixed(1)}</span>
          <StockBadge stock={product.stock} />
        </div>

        <p className="max-w-[60ch]">{product.description}</p>

        <div className="flex flex-wrap items-center gap-3">
          {/* Math.max keeps a valid range when stock is 0. The whole control is disabled then anyway. */}
          <Stepper value={quantity} max={Math.max(product.stock, 1)} onChange={setQuantity} />
          <Button disabled={isOut} onClick={handleAdd} className="flex-[1_1_200px]">
            {isOut ? "Out of stock" : "Add to cart"}
          </Button>
        </div>
        <p role="status" className="min-h-[1.45em] font-semibold">
          {feedback}
        </p>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Only whole positive numbers count as an id. A regex, because Number("1e3") would pass as 1000.
   * /products/abc then shows NotFound straight away, with no request sent (PRD P3.2).
   */
  const productId = id !== undefined && /^[1-9]\d*$/.test(id) ? Number(id) : null;

  /** The product. Null while loading, on an error, and when it doesn't exist. */
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(productId !== null);
  const [error, setError] = useState<string | null>(null);

  // Loads the product, and again whenever the id changes. Leaving `productId` out of the list below is
  // the classic bug the PRD warns about: the URL changes, but the old product stays on screen.
  useEffect(() => {
    if (productId === null) {
      return;
    }
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchProduct(productId)
      .then((data) => {
        if (!isCancelled) {
          setProduct(data);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setError("Could not load this product. Check your connection and reload the page.");
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
  }, [productId]);

  /**
   * Back keeps the catalog as it was. On a direct visit there is no earlier page in this app, so
   * going back would leave the shop. `location.key` is "default" in exactly that case.
   */
  function handleBack(event: MouseEvent<HTMLAnchorElement>) {
    if (location.key !== "default") {
      event.preventDefault();
      navigate(-1);
    }
  }

  if (productId === null || (!isLoading && !error && product === null)) {
    return <NotFoundPage />;
  }

  return (
    <section className="p-3.5 tablet:px-6 tablet:pt-3 tablet:pb-6">
      <Link
        to="/"
        onClick={handleBack}
        className="mb-2 inline-flex min-h-11 items-center font-semibold text-ink-soft hover:text-ink hover:underline"
      >
        ← Back to catalog
      </Link>
      {isLoading && <StateMessage title="Loading product…" />}
      {error && <StateMessage title={error} role="alert" />}
      {/* `key` gives each product its own fresh details, so quantity and photo don't carry over. */}
      {!isLoading && !error && product && <ProductDetails key={product.id} product={product} />}
    </section>
  );
}
