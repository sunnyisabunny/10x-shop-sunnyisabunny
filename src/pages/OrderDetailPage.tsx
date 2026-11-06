/**
 * NOTE: one order in full: status, items, address, totals and Reorder (PRD P6.3).
 * Why it exists: this is also where a new order lands, with the Thank-you banner on top.
 * Connects to: `useOrders` and `useNow`. `useCart` is what Reorder adds to.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import Invoice from "../components/order/Invoice";
import { OrderStatusBadge, OrderTimeline } from "../components/order/OrderStatus";
import Button from "../components/ui/Button";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useNow, useOrders } from "../hooks/useOrders";
import type { CartItem } from "../types/cart";
import { discountedPrice, formatDate, formatDiscount, formatPrice, formatShipping, lineTotal } from "../utils/format";
import NotFoundPage from "./NotFoundPage";

// EXTRA: the printed receipt and the truck. Deleting these two lines and their uses below leaves a complete page.
const Receipt = lazy(() => import("../extras/Receipt"));
const TruckTracker = lazy(() => import("../extras/TruckTracker"));

/** `location.state` has the type `any`, so this type guard checks its real shape at runtime. */
function isJustPlaced(state: unknown): boolean {
  return typeof state === "object" && state !== null && "justPlaced" in state && state.justPlaced === true;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { orders } = useOrders();
  const { addItem, quantityOf } = useCart();
  const { showToast } = useToast();
  const now = useNow();

  /** Whether this visit is the one right after ordering. Read once, because the effect below clears the source. */
  const [justPlaced] = useState(() => isJustPlaced(location.state));

  /**
   * Forgets the "just placed" mark straight after reading it. The browser keeps `location.state` in its
   * history, so otherwise every reload and every Back to this page would say thank you again, as if another
   * order had gone through.
   */
  useEffect(() => {
    if (isJustPlaced(location.state)) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const order = orders.find((candidate) => String(candidate.id) === id);

  if (order === undefined) {
    return <NotFoundPage />;
  }

  /**
   * PRD P6: puts the same items back in the cart and goes there. The stock limit still applies, so each line adds
   * what fits, and the message says what really happened. `addItem` itself would refuse a line that doesn't fit.
   */
  function handleReorder(items: CartItem[]) {
    const added = items.map((item) => {
      const quantity = Math.min(item.quantity, item.stock - quantityOf(item.productId));
      const product = { id: item.productId, title: item.title, thumbnail: item.thumbnail, price: item.price, discountPercentage: item.discountPercentage, stock: item.stock };
      return quantity > 0 && addItem(product, quantity) ? quantity : 0;
    });
    if (added.every((quantity) => quantity === 0)) {
      showToast("Nothing added. Your cart already holds all the stock of these items.");
    } else {
      showToast(added.every((quantity, index) => quantity === items[index].quantity) ? "Items added to cart ✓" : "Items added to cart ✓ Some were limited by stock.");
    }
    navigate("/cart");
  }

  /**
   * Opens the browser's own print dialog, which can also save a PDF. The page title is what that PDF gets named, so it
   * says which order this is for a moment. Without that, every saved invoice would be called "10X Shop".
   */
  function handlePrint(orderNumber: string) {
    const previousTitle = document.title;
    document.title = `Invoice ${orderNumber}`;
    window.print();
    document.title = previousTitle;
  }

  const { shipping } = order;

  return (
    <>
      <Invoice order={order} />
      {/* `data-screen-only` takes the whole screen version off paper, leaving only the invoice above. See index.css. */}
      <section data-screen-only className="grid gap-5 p-3.5 tablet:px-6 tablet:pt-5 tablet:pb-6">
        {justPlaced && (
          <div role="status" className="rounded-[10px] bg-discount p-4 text-on-discount">
            <h1 className="text-[26px] leading-[1.15] font-bold">Thank you! Your order has been placed.</h1>
            <p className="mt-1 font-semibold">Total {formatPrice(order.total)}. No payment was taken.</p>
          </div>
        )}

        {/* EXTRA: no fallback, so a broken or slow receipt can't affect the order. */}
        {justPlaced && (
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <Receipt order={order} />
            </Suspense>
          </ErrorBoundary>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {/* The page's main heading, unless the banner above already holds it. */}
            {justPlaced ? (
              <h2 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Order #{order.number}</h2>
            ) : (
              <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Order #{order.number}</h1>
            )}
            <p className="text-ink-soft">{formatDate(order.placedAt)}</p>
          </div>
          <OrderStatusBadge status={order.getStatus(now)} />
        </div>

        <OrderTimeline status={order.getStatus(now)} />

        {/* EXTRA: the same, for the truck. */}
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <TruckTracker placedAt={order.placedAt} status={order.getStatus(now)} />
          </Suspense>
        </ErrorBoundary>

        <div className="grid gap-5 desktop:grid-cols-[minmax(0,1fr)_360px]">
          <ul className="grid content-start gap-2.5">
            {order.items.map((item) => (
              <li key={item.productId} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-shelf p-2.5 shadow-[inset_0_0_0_1px_var(--edge)]">
                <div className="lit-glass flex size-16 items-center justify-center overflow-hidden rounded-md">
                  <img src={item.thumbnail} alt="" width={56} height={56} loading="lazy" className="size-[84%] object-contain" />
                </div>
                <div className="min-w-0">
                  <Link to={`/products/${item.productId}`} className="flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
                    {item.title}
                  </Link>
                  <div className="text-[13px] text-ink-soft">
                    {item.quantity} × {formatPrice(discountedPrice(item.price, item.discountPercentage))}
                  </div>
                </div>
                <div className="font-semibold">{formatPrice(lineTotal(item))}</div>
              </li>
            ))}
          </ul>

          <aside className="grid content-start gap-2.5 rounded-[10px] bg-steel-raised p-4 shadow-[inset_0_0_0_1px_var(--edge)]">
            <div>
              <h2 className="font-bold">Delivery address</h2>
              <p className="text-ink-soft">
                {shipping.fullName}
                <br />
                {shipping.address}
                <br />
                {shipping.city} {shipping.postalCode}, {shipping.country}
              </p>
            </div>
            <div className="flex justify-between gap-3 border-t border-edge pt-2.5">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Discount</span>
              <span>{formatDiscount(order.discount)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Shipping</span>
              <span>{formatShipping(order.shippingCost)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-md bg-led-panel px-3 py-2 text-led">
              <span>Total</span>
              <b className="led-text text-[30px]">{formatPrice(order.total)}</b>
            </div>
            <Button onClick={() => handleReorder(order.items)}>Reorder</Button>
            <Button variant="quiet" onClick={() => handlePrint(order.number)}>
              Print invoice
            </Button>
          </aside>
        </div>
      </section>
    </>
  );
}
