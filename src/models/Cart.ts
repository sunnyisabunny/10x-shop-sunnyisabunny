/**
 * NOTE: all the cart's money calculations, in one class with no React in it (PRD P4.3, T4).
 * Why it exists: the Cart page, Checkout and the order record must all agree on the total. One class means one
 * answer, and a class fits here because the data (the items) and the operations on it belong together.
 * Connects to: `CartContext` creates one from the current state. `Order` copies the numbers when an order is placed.
 *
 * OOP shown here: `implements ICart` (a promise the class must keep), `private readonly` fields, a getter
 * (`itemCount` reads like a property), and `static` values that belong to the class, not to one cart.
 */
import type { CartItem } from "../types/cart";
import { FREE_SHIPPING_FROM, PROMO_CODE, PROMO_PERCENT, SHIPPING_COST } from "../utils/constants";
import { discountedPrice } from "../utils/format";

/** What any cart must be able to answer. */
export interface ICart {
  subtotal(): number;
  discount(): number;
  shipping(): number;
  total(): number;
}

/** Rounds to cents. Adding floating-point numbers can leave tiny remainders like 0.30000000000000004. */
function toCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export class Cart implements ICart {
  static readonly FREE_SHIPPING_FROM = FREE_SHIPPING_FROM;
  static readonly SHIPPING_COST = SHIPPING_COST;

  constructor(
    private readonly items: CartItem[],
    private readonly promoCode: string | null,
  ) {}

  /** True if this is the working promo code, in any letter case (PRD P4.4). */
  static isValidPromo(code: string): boolean {
    return code.trim().toUpperCase() === PROMO_CODE;
  }

  /** The cart lines. A getter, so they can be read but the field itself stays private. */
  get lines(): CartItem[] {
    return this.items;
  }

  /** Total units. Two of one product counts as 2. */
  get itemCount(): number {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  /** The sum of each line's price after its product discount. */
  subtotal(): number {
    return toCents(this.items.reduce((sum, item) => sum + discountedPrice(item.price, item.discountPercentage) * item.quantity, 0));
  }

  /** How much the promo code takes off the subtotal. */
  discount(): number {
    return this.promoCode === null ? 0 : toCents((this.subtotal() * PROMO_PERCENT) / 100);
  }

  /** Free from the threshold upwards, counted after the promo discount, since that is what you really pay. */
  shipping(): number {
    if (this.items.length === 0 || this.subtotal() - this.discount() >= Cart.FREE_SHIPPING_FROM) {
      return 0;
    }
    return Cart.SHIPPING_COST;
  }

  total(): number {
    return toCents(this.subtotal() - this.discount() + this.shipping());
  }
}
