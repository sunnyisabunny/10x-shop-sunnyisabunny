/**
 * NOTE: how an order's status is shown: a coloured badge and a three-step timeline (PRD P6).
 * Why it exists: the list and the details page must show a status identically.
 * Connects to: `OrdersPage` uses the badge, and `OrderDetailPage` uses both.
 */
import type { OrderStatus } from "../../types/order";
import { ORDER_STATUS_STEPS } from "../../utils/constants";

/** The PRD's colours per status. `Record<OrderStatus, ...>` means forgetting one doesn't compile. */
const badgeStyles: Record<OrderStatus, string> = {
  Processing: "bg-[#5b667a] text-white",
  Shipped: "bg-[#2563eb] text-white",
  Delivered: "bg-discount text-on-discount",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-[3px] px-2 py-0.5 text-[13px] font-bold ${badgeStyles[status]}`}>{status}</span>;
}

/** Processing ✓ -> Shipped ✓ -> Delivered ○. Steps up to the current status are done. */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER_STATUS_STEPS.findIndex((step) => step.status === status);

  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {ORDER_STATUS_STEPS.map((step, index) => {
        const isDone = index <= currentIndex;
        return (
          <li key={step.status} aria-current={index === currentIndex ? "step" : undefined} className={`flex items-center gap-1.5 font-semibold ${isDone ? "text-ink" : "text-ink-soft"}`}>
            <span aria-hidden="true">{isDone ? "✓" : "○"}</span>
            {step.status}
            {index < ORDER_STATUS_STEPS.length - 1 && (
              <span aria-hidden="true" className="ml-1.5 text-ink-soft">
                ›
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
