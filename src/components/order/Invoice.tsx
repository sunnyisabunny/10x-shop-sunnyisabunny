/**
 * NOTE: a plain paper invoice for one order, shown only when printing (BONUS).
 * Why it exists: the screen version of an order is built for a dark machine. Paper wants black on white and a real
 * table, so this is drawn separately instead of bending the page into shape.
 * Connects to: `OrderDetailPage`. `hidden print:block` is Tailwind's `print:` variant: off on screen, on for paper.
 * A rule in `index.css` looks for the `invoice` class below and takes everything marked `data-screen-only` off paper. It
 * only applies when an invoice is on the page, so printing any other page isn't affected.
 */
import type { Order } from "@/models/Order";
import { discountedPrice, formatDate, formatDiscount, formatPrice, formatShipping, lineTotal } from "@/utils/format";

/** One line in the totals. */
function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-8 py-1 ${strong ? "border-t-2 border-black font-bold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function Invoice({ order }: { order: Order }) {
  const { shipping } = order;

  return (
    <section aria-label="Printable invoice" className="invoice hidden bg-white p-2 text-[13px] text-black print:block">
      <header className="flex justify-between gap-6 border-b-2 border-black pb-3">
        <div>
          <p className="text-[22px] font-bold">10X Shop</p>
          <p>Open all night.</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold">Invoice</p>
          <p>Order #{order.number}</p>
          <p>{formatDate(order.placedAt)}</p>
        </div>
      </header>

      <div className="py-3">
        <p className="font-bold">Deliver to</p>
        <p>{shipping.fullName}</p>
        <p>{shipping.address}</p>
        <p>
          {shipping.city} {shipping.postalCode}, {shipping.country}
        </p>
        <p>{shipping.email}</p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1 pr-2">Item</th>
            <th className="py-1 pr-2 text-right">Qty</th>
            <th className="py-1 pr-2 text-right">Unit price</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            // `break-inside-avoid` keeps a row whole across a page break, and `whitespace-nowrap` keeps an amount whole
            // when a long title squeezes its column.
            <tr key={item.productId} className="break-inside-avoid border-b border-[#bbb]">
              <td className="py-1 pr-2">{item.title}</td>
              <td className="py-1 pr-2 text-right">{item.quantity}</td>
              <td className="py-1 pr-2 text-right whitespace-nowrap">{formatPrice(discountedPrice(item.price, item.discountPercentage))}</td>
              <td className="py-1 text-right whitespace-nowrap">{formatPrice(lineTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 ml-auto w-64 break-inside-avoid">
        <TotalRow label="Subtotal" value={formatPrice(order.subtotal)} />
        <TotalRow label="Discount" value={formatDiscount(order.discount)} />
        <TotalRow label="Shipping" value={formatShipping(order.shippingCost)} />
        <TotalRow label="Total" value={formatPrice(order.total)} strong />
      </div>

      <p className="mt-6 border-t border-[#bbb] pt-2">This is a student project. No payment was taken and nothing will be delivered.</p>
    </section>
  );
}
