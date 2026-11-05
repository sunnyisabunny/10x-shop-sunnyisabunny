/**
 * NOTE: one row on the Cart page: photo, title, unit price, quantity, line total, Remove (PRD P4.1).
 * Why it exists: `CartPage` maps over the items and draws one of these for each.
 * Connects to: `CartPage` passes the item and the two callbacks, so this component doesn't need the context.
 */
import { Link } from "react-router";
import type { CartItem } from "../../types/cart";
import { discountedPrice, formatPrice } from "../../utils/format";
import Stepper from "../ui/Stepper";

interface CartLineProps {
  item: CartItem;
  onQuantityChange: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}

export default function CartLine({ item, onQuantityChange, onRemove }: CartLineProps) {
  const unitPrice = discountedPrice(item.price, item.discountPercentage);

  return (
    <li className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 rounded-lg bg-shelf p-2.5 shadow-[inset_0_0_0_1px_var(--edge)] tablet:grid-cols-[92px_minmax(0,1fr)_auto_auto]">
      <div className="lit-glass flex size-[76px] items-center justify-center overflow-hidden rounded-lg tablet:size-[92px]">
        <img src={item.thumbnail} alt="" width={84} height={84} loading="lazy" className="size-[84%] object-contain" />
      </div>
      <div className="min-w-0">
        {/* min-h-11 keeps the tap area at 44px even when the title is one short word like "Lemon". */}
        <Link to={`/products/${item.productId}`} className="flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
          {item.title}
        </Link>
        <div className="text-ink-soft">{formatPrice(unitPrice)} each</div>
        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          className="min-h-11 font-semibold text-ink-soft underline hover:text-ink"
        >
          Remove
        </button>
      </div>
      <Stepper
        label={`Quantity of ${item.title}`}
        value={item.quantity}
        max={item.stock}
        onChange={(quantity) => onQuantityChange(item.productId, quantity)}
      />
      <div className="led-text min-w-[118px] justify-self-end rounded bg-led-panel px-2 py-0.5 text-right text-[22px]">
        {formatPrice(unitPrice * item.quantity)}
      </div>
    </li>
  );
}
