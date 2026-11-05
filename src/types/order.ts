/**
 * NOTE: the types for placing an order.
 * Why it exists: the Checkout form and the confirmation screen must agree on these fields.
 * Connects to: `pages/CheckoutPage.tsx`.
 *
 * There is deliberately no payment method and no card field anywhere. The PRD rules them out.
 */

/** The Checkout form's four required controlled fields. */
export interface ShippingInfo {
  fullName: string;
  email: string;
  address: string;
  city: string;
}
