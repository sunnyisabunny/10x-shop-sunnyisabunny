/**
 * NOTE: the totals panel, with the total on an LED display (PRD P4.1).
 * Why it exists: the Cart page and the Checkout page show the same numbers.
 * Connects to: `useCart` supplies the numbers. Pages decide what goes in `children`, such as a button.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { useCart } from "../../context/CartContext";
import { PROMO_PERCENT } from "../../utils/constants";
import { formatPrice } from "../../utils/format";
import { inputStyles } from "../ui/FormField";

interface CartSummaryProps {
  /** Only the Cart page can add or remove a promo code. Checkout just shows the result. */
  showPromoForm?: boolean;
  children?: ReactNode;
}

/** The promo code field. Its own component, so its typing doesn't redraw the rest of the panel. */
function PromoForm() {
  const { applyPromo } = useCart();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (applyPromo(code)) {
      setCode("");
      setError(null);
    } else {
      setError("Invalid promo code");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-1">
      <label htmlFor="promo" className="text-[13px] text-ink-soft">
        Promo code
      </label>
      <div className="flex gap-2">
        <input
          id="promo"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? "promo-error" : undefined}
          className={inputStyles}
        />
        <button
          type="submit"
          className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-steel px-3.5 font-semibold whitespace-nowrap text-ink shadow-[inset_0_0_0_1px_var(--edge-bright)] transition-colors duration-150 hover:bg-edge"
        >
          Apply
        </button>
      </div>
      {error !== null && (
        <p id="promo-error" className="text-[13px] font-semibold text-error">
          {error}
        </p>
      )}
    </form>
  );
}

export default function CartSummary({ showPromoForm = false, children }: CartSummaryProps) {
  const { subtotal, discount, shipping, total, promoCode, removePromo } = useCart();

  return (
    <aside aria-label="Order summary" className="grid gap-2.5 self-start rounded-[10px] bg-steel-raised p-4 shadow-[inset_0_0_0_1px_var(--edge)]">
      <div className="flex justify-between gap-3">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span>
          {/* The exact PRD wording when a code is applied, and a plain line when not. */}
          {promoCode !== null ? `Discount (${promoCode} −${PROMO_PERCENT}%)` : "Discount"}
          {/* Checkout is read-only: changing the total there could make the saved order differ from the screen. */}
          {promoCode !== null && showPromoForm && (
            <button type="button" onClick={removePromo} className="ml-2 min-h-11 font-semibold text-ink-soft underline hover:text-ink">
              Remove
            </button>
          )}
        </span>
        <span>{discount > 0 ? `−${formatPrice(discount)}` : formatPrice(0)}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span>Shipping</span>
        <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-md bg-led-panel px-3 py-2 text-led">
        <span>Total</span>
        <b className="led-text text-[34px]">{formatPrice(total)}</b>
      </div>
      {showPromoForm && promoCode === null && <PromoForm />}
      {children}
    </aside>
  );
}
