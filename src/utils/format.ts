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

/** A date as text, in the visitor's own format. The date's meaning doesn't depend on the locale, unlike money. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/** "1 item" or "5 items". Search and filters make a single result possible, and "1 items" reads as a bug. */
export function formatItemCount(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

/** Turns the API's "mobile-accessories" into "Mobile accessories" for display. */
export function formatCategory(slug: string): string {
  const words = slug.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The machine's slot label for a position in the grid: A1, A2, A3, A4, B1 and so on, four to a row.
 * Past row Z it continues with AA, like spreadsheet columns, because Endless mode can show all 194.
 */
export function slotCode(index: number): string {
  const SLOTS_PER_ROW = 4;
  let row = Math.floor(index / SLOTS_PER_ROW);
  let letters = "";
  do {
    letters = String.fromCharCode(65 + (row % 26)) + letters;
    row = Math.floor(row / 26) - 1;
  } while (row >= 0);
  return `${letters}${(index % SLOTS_PER_ROW) + 1}`;
}
