/**
 * NOTE: a small pixel truck that crosses an LED strip under the order's timeline (beyond the spec).
 * Why it exists: the status changes by a timer, and watching a truck is a nicer way to wait than reading a label.
 * Connects to: `OrderDetailPage` loads this lazily, in tagged lines. The timeline above it stays the real status, so
 * `aria-hidden` keeps this from screen readers. Delivery is simulated, and the shop says so everywhere it matters.
 */
import { useState } from "react";
import type { OrderStatus } from "../types/order";
import { ORDER_STATUS_STEPS } from "../utils/constants";

/** When the truck leaves and arrives, read from the same steps as the status, so changing a timing moves both together. */
const LEAVES_AT_MS = ORDER_STATUS_STEPS[0].untilMs;
const ARRIVES_AT_MS = ORDER_STATUS_STEPS[1].untilMs;

/** What the strip says at each stage. A `Record`, so leaving a status out wouldn't compile. */
const CAPTIONS: Record<OrderStatus, string> = {
  Processing: "The truck is warming up.",
  Shipped: "The truck is on its way. It is a small truck.",
  Delivered: "Delivered. The truck has gone home.",
};

export default function TruckTracker({ placedAt, status }: { placedAt: string; status: OrderStatus }) {
  /** How old the order was when this page opened. Read once: after that the browser does the counting, so no timer runs. */
  const [ageMs] = useState(() => Date.now() - new Date(placedAt).getTime());

  return (
    <div data-screen-only aria-hidden="true" className="truck-road">
      {/* A negative delay starts the animation part-way through. So a page opened late shows the truck where it should be,
          and one opened early waits at the start until it's time to leave. Nothing here needs to run again. */}
      <div className="truck-run" data-status={status} style={{ animationDuration: `${ARRIVES_AT_MS - LEAVES_AT_MS}ms`, animationDelay: `${LEAVES_AT_MS - ageMs}ms` }}>
        <svg viewBox="0 0 28 14" width="56" height="28" shapeRendering="crispEdges">
          <rect x="0" y="1" width="17" height="9" fill="#d5dae3" />
          <rect x="1" y="3" width="15" height="2" fill="#ff2e63" />
          <rect x="18" y="4" width="8" height="6" fill="#f2a53c" />
          <rect x="22" y="5" width="3" height="2" fill="#10141d" />
          <rect x="3" y="10" width="4" height="3" fill="#10141d" />
          <rect x="19" y="10" width="4" height="3" fill="#10141d" />
          <rect x="4" y="11" width="2" height="1" fill="#a9b4c6" />
          <rect x="20" y="11" width="2" height="1" fill="#a9b4c6" />
        </svg>
      </div>
      <p className="truck-caption">{CAPTIONS[status]}</p>
    </div>
  );
}
