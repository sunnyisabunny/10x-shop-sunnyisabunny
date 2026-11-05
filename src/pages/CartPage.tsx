/**
 * NOTE: the Cart page: lines, quantities, totals and the way to Checkout (PRD P4).
 * Why it exists: the last stop before paying, where people change their mind.
 * Connects to: `CartContext` holds the data. `CartLine` and `CartSummary` draw it.
 */
import { Link, useNavigate } from "react-router";
import CartLine from "../components/cart/CartLine";
import CartSummary from "../components/cart/CartSummary";
import Button, { buttonStyles } from "../components/ui/Button";
import StateMessage from "../components/ui/StateMessage";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function CartPage() {
  const { items, itemCount, total, removeItem, setQuantity, clear } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  /** PRD P4: removing a line confirms it with this exact toast. */
  function handleRemove(productId: number) {
    removeItem(productId);
    showToast("Removed from cart");
  }

  /** PRD: Clear cart asks first, with these exact words, because it can't be undone. */
  function handleClear() {
    if (window.confirm("Clear the cart? This cannot be undone.")) {
      clear();
    }
  }

  return (
    <section className="grid gap-3.5 p-3.5 tablet:px-6 tablet:pt-5 tablet:pb-6">
      <div className="flex flex-wrap items-baseline gap-x-3.5">
        <h1 className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em]">Cart</h1>
        {itemCount > 0 && <span className="text-ink-soft">{itemCount === 1 ? "1 item" : `${itemCount} items`}</span>}
      </div>

      {items.length === 0 ? (
        // The empty state: says what happened and gives one clear way forward. No summary, as the PRD asks.
        <StateMessage title="Your cart is empty.">
          <Link to="/" className={buttonStyles.primary}>
            Browse products
          </Link>
        </StateMessage>
      ) : (
        // Stacks on a phone with the summary below the list, and sits side by side from desktop width.
        <div className="grid gap-5 desktop:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <ul className="grid gap-2.5">
              {items.map((item) => (
                <CartLine key={item.productId} item={item} onQuantityChange={setQuantity} onRemove={handleRemove} />
              ))}
            </ul>
            <button type="button" onClick={handleClear} className="mt-1.5 min-h-11 font-semibold text-ink-soft underline hover:text-ink">
              Clear cart
            </button>
          </div>
          <CartSummary total={total}>
            {/* The login check isn't repeated here. ProtectedRoute does it, as the PRD says. */}
            <Button onClick={() => navigate("/checkout")}>Proceed to checkout</Button>
          </CartSummary>
        </div>
      )}
    </section>
  );
}
