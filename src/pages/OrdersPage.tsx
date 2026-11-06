/**
 * NOTE: the list of past orders, newest first, with live statuses (PRD P6.1).
 * Why it exists: an order is only finished for the buyer when they can see where it is.
 * Connects to: `useOrders` (the data), `useNow` (the clock), `OrderStatusBadge`, and each order's details page.
 */
import { Link } from "react-router";
import { OrderStatusBadge } from "@/components/order/OrderStatus";
import { buttonStyles } from "@/components/ui/Button";
import StateMessage from "@/components/ui/StateMessage";
import { useNow, useOrders } from "@/hooks/useOrders";
import { formatDate, formatItemCount, formatPrice } from "@/utils/format";

export default function OrdersPage() {
  const { orders } = useOrders();

  // Each tick redraws the page, and each status is recalculated with the new time, so a status changes
  // while you watch, with no reload.
  const now = useNow();

  return (
    <section className="grid gap-3.5 p-3.5 tablet:px-6 tablet:pt-5 tablet:pb-6">
      <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Orders</h1>

      {orders.length === 0 ? (
        <StateMessage title="You have no orders yet.">
          <Link to="/" className={buttonStyles.primary}>
            Browse products
          </Link>
        </StateMessage>
      ) : (
        <ul className="grid gap-2.5">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="grid min-h-11 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg bg-shelf p-3.5 no-underline shadow-[inset_0_0_0_1px_var(--edge)] transition-shadow duration-150 hover:shadow-[inset_0_0_0_1px_var(--edge-bright)] tablet:grid-cols-[1fr_auto_auto]"
              >
                <span>
                  <strong>#{order.number}</strong>
                  <span className="block text-[13px] text-ink-soft">
                    {formatDate(order.placedAt)}, {formatItemCount(order.items.reduce((count, item) => count + item.quantity, 0))}
                  </span>
                </span>
                <span className="justify-self-end">
                  <OrderStatusBadge status={order.getStatus(now)} />
                </span>
                <span className="led-text col-span-full justify-self-start rounded bg-led-panel px-2 py-0.5 text-[22px] tablet:col-span-1 tablet:justify-self-end">
                  {formatPrice(order.total)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
