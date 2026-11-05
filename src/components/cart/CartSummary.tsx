/**
 * NOTE: the totals panel, with the total on an LED display.
 * Why it exists: the Cart page and the Checkout page show the same totals (PRD P4.1, P5).
 * Connects to: `CartPage` and `CheckoutPage`, which decide what goes in `children` (such as a button).
 */
import type { ReactNode } from "react";
import { formatPrice } from "../../utils/format";

interface CartSummaryProps {
  total: number;
  children?: ReactNode;
}

export default function CartSummary({ total, children }: CartSummaryProps) {
  return (
    <aside aria-label="Order summary" className="grid gap-2.5 self-start rounded-[10px] bg-steel-raised p-4 shadow-[inset_0_0_0_1px_var(--edge)]">
      <div className="flex justify-between gap-3">
        <span>Subtotal</span>
        <span>{formatPrice(total)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-md bg-led-panel px-3 py-2 text-led">
        <span>Total</span>
        <b className="led-text text-[34px]">{formatPrice(total)}</b>
      </div>
      {children}
    </aside>
  );
}
