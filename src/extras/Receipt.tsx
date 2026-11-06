/**
 * NOTE: the paper that prints out of the machine when an order is placed (beyond the spec).
 * Why it exists: people remember how something ends, so the last moment of buying gets the most care.
 * Connects to: `OrderDetailPage` loads this lazily, in tagged lines, and only right after ordering. The order is real, and
 * every number comes from it. The page already shows all this in text, so `aria-hidden` saves screen readers hearing it twice.
 */
import { useEffect } from "react";
import type { OrderRecord } from "@/types/order";
import { formatDiscount, formatPrice, formatShipping, lineTotal } from "@/utils/format";
import { playSound } from "./sound/SoundToggle";

/** One line of the receipt, with its label on the left and its amount on the right. */
function ReceiptRow({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="receipt-row">
      <span>{label}</span>
      <span>{amount}</span>
    </div>
  );
}

export default function Receipt({ order }: { order: OrderRecord }) {
  // The printer's sound, once, when the paper starts. `playSound` does nothing unless sound is on.
  useEffect(() => {
    playSound("print");
  }, []);

  return (
    <div data-screen-only aria-hidden="true" className="receipt-printer">
      <div className="receipt-slot" />
      {/* This clips the paper, so it seems to come out of the slot above. */}
      <div className="overflow-hidden">
        <div className="receipt">
          <div className="text-center">
            10X SHOP
            <br />
            OPEN ALL NIGHT
          </div>
          <div className="receipt-rule" />
          <ReceiptRow label="ORDER" amount={order.number} />
          <div className="receipt-rule" />
          {order.items.map((item) => (
            <ReceiptRow key={item.productId} label={`${item.quantity} x ${item.title}`} amount={formatPrice(lineTotal(item))} />
          ))}
          <div className="receipt-rule" />
          <ReceiptRow label="Subtotal" amount={formatPrice(order.subtotal)} />
          {order.discount > 0 && <ReceiptRow label="Discount" amount={formatDiscount(order.discount)} />}
          <ReceiptRow label="Shipping" amount={formatShipping(order.shippingCost)} />
          <div className="text-[20px]">
            <ReceiptRow label="TOTAL" amount={formatPrice(order.total)} />
          </div>
          <div className="receipt-rule" />
          <div className="text-center">
            NO PAYMENT WAS TAKEN.
            <br />
            KEEP THIS RECEIPT.
            <br />
            IT PROVES NOTHING.
          </div>
          <div className="receipt-barcode" />
        </div>
      </div>
    </div>
  );
}
