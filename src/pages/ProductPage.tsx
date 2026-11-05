/**
 * NOTE: the product page: one product in detail, with a quantity and Add to cart (PRD P3).
 * Why it exists: this is where someone decides to buy.
 * Connects to: `useFetch` (data), `Gallery` (photos), `PriceBlock` (price), `useAddToCart` (adding).
 */
import { useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { productPath } from "../api/products.api";
import Gallery from "../components/product/Gallery";
import { PriceBlock, StockBadge } from "../components/product/PriceBlock";
import Button from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import Stepper from "../components/ui/Stepper";
import { useAddToCart } from "../hooks/useAddToCart";
import { useFetch } from "../hooks/useFetch";
import type { Product } from "../types/product";
import { formatCategory } from "../utils/format";
import NotFoundPage from "./NotFoundPage";

/** `location.state` has the type `any`, so this type guard checks its real shape at runtime. */
function cameFromCatalog(state: unknown): boolean {
  return typeof state === "object" && state !== null && "fromCatalog" in state && state.fromCatalog === true;
}

/** The product's details and controls. Split out so its quantity starts fresh for each product. */
function ProductDetails({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const isOut = product.stock === 0;

  /** How many to add. The Stepper keeps it between 1 and the stock. */
  const [quantity, setQuantity] = useState(1);

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
          <Button disabled={isOut} onClick={() => addToCart(product, quantity)} className="flex-[1_1_200px]">
            {isOut ? "Out of stock" : "Add to cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Placeholder shapes while the product loads, matching the real layout so the page doesn't jump. */
function ProductSkeleton() {
  return (
    <div role="status" className="grid gap-5 desktop:grid-cols-2 desktop:gap-7">
      <span className="sr-only">Loading product…</span>
      <div aria-hidden="true" className="dim-glass aspect-[1/0.82] animate-pulse rounded-lg" />
      <div aria-hidden="true" className="grid animate-pulse content-start gap-3.5">
        <div className="h-9 w-3/4 rounded bg-edge" />
        <div className="h-5 w-1/3 rounded bg-edge" />
        <div className="h-[92px] rounded-md bg-led-panel" />
        <div className="h-24 rounded bg-edge" />
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

  // The path holds the id, so moving to another product changes the path and useFetch loads it again.
  // This is the classic bug the PRD warns about, when a page's URL changes but its data doesn't.
  const { state, retry } = useFetch<Product>(productId === null ? null : productPath(productId));

  /**
   * The PRD uses navigate(-1) here, so the catalog keeps its filters. That is only honest when the
   * previous page really was the catalog, so a card from the catalog says so in `state`. Arriving any
   * other way, such as from the Cart or a shared link, the link's plain "/" does the job.
   * Ctrl-click and similar are left alone, so "open in a new tab" still works.
   */
  function handleBack(event: MouseEvent<HTMLAnchorElement>) {
    const isPlainClick = !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
    if (isPlainClick && cameFromCatalog(location.state)) {
      event.preventDefault();
      navigate(-1);
    }
  }

  // A bad id or an API 404 both mean this product doesn't exist. Other errors can be retried.
  if (state.status === "idle" || (state.status === "error" && state.httpStatus === 404)) {
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
      {state.status === "loading" && <ProductSkeleton />}
      {state.status === "error" && (
        <StateMessage title={state.message} role="alert">
          <Button variant="quiet" onClick={retry}>
            Retry
          </Button>
        </StateMessage>
      )}
      {/* `key` gives each product its own fresh details, so quantity and photo don't carry over. */}
      {state.status === "success" && <ProductDetails key={state.data.id} product={state.data} />}
    </section>
  );
}
