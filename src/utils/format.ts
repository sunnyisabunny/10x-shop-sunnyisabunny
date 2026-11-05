/**
 * NOTE: small pure helpers for showing prices.
 * Why it exists: the discount formula and the money format must be the same on every card, line and
 * total. One function each means they can't drift apart.
 * Connects to: `PriceBlock`, the cart lines and the order summary.
 */

/**
 * The price after discount: price x (1 - discount / 100), rounded to 2 decimals.
 * It works in cents and rounds once, because repeated floating-point maths can leave values like
 * 8.940000000000001, and adding those up would make a cart total off by a cent.
 */
export function discountedPrice(price: number, discountPercentage: number): number {
  return Math.round(price * (1 - discountPercentage / 100) * 100) / 100;
}

/**
 * Money as text, like $1,299.00.
 * The locale is fixed to "en-US" on purpose. Left to the browser, a Georgian system would write the
 * number differently from the format the PRD asks for.
 */
export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}
