/**
 * NOTE: unit tests for the price and label helpers in `src/utils/format.ts`.
 * Why it exists: every price, discount, shipping line, item count and slot label on screen comes from these
 * functions, so one rounding or format mistake here would show on every card, cart line and total.
 * Connects to: `src/utils/format.ts`, used by `PriceBlock`, the cart, Checkout, the order pages and the product grid.
 */

import { describe, expect, it } from "vitest";
import { discountedPrice, formatDiscount, formatItemCount, formatPrice, formatShipping, slotCode } from "@/utils/format";

describe("discountedPrice", () => {
  it("takes 10% off 100", () => {
    expect(discountedPrice(100, 10)).toBe(90);
  });

  it("rounds to whole cents, so 10.5% off 9.99 is 8.94 and not 8.94105", () => {
    expect(discountedPrice(9.99, 10.5)).toBe(8.94);
  });
});

describe("formatPrice", () => {
  it("writes dollars the US way, with a thousands comma and two decimals", () => {
    expect(formatPrice(1299)).toBe("$1,299.00");
  });
});

describe("formatDiscount", () => {
  it("puts a real minus sign, not a hyphen, in front of a discount", () => {
    expect(formatDiscount(5)).toBe("−$5.00");
  });

  it("shows $0.00 with no minus sign when there is no discount", () => {
    expect(formatDiscount(0)).toBe("$0.00");
  });
});

describe("formatShipping", () => {
  it("says Free when shipping costs nothing", () => {
    expect(formatShipping(0)).toBe("Free");
  });

  it("shows the price when shipping costs something", () => {
    expect(formatShipping(10)).toBe("$10.00");
  });
});

describe("formatItemCount", () => {
  it("says 1 item, not 1 items", () => {
    expect(formatItemCount(1)).toBe("1 item");
  });

  it("uses the plural for other counts", () => {
    expect(formatItemCount(5)).toBe("5 items");
  });
});

describe("slotCode", () => {
  it("labels four slots to a row: A1 to A4, then B1", () => {
    expect(slotCode(0)).toBe("A1");
    expect(slotCode(3)).toBe("A4");
    expect(slotCode(4)).toBe("B1");
  });

  it("goes from Z4 to AA1 after row Z, like spreadsheet columns", () => {
    expect(slotCode(103)).toBe("Z4");
    expect(slotCode(104)).toBe("AA1");
  });
});
