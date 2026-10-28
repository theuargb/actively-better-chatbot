import { describe, expect, it } from "vitest";
import { formatPlanPrice, fromStripeAmount } from "./currency";

describe("formatPlanPrice", () => {
  it("drops decimals from whole amounts", () => {
    expect(formatPlanPrice("19.00", "USD", "en-US")).toBe("$19");
    expect(formatPlanPrice(0, "USD", "en-US")).toBe("$0");
  });

  it("keeps cents when the amount has them", () => {
    expect(formatPlanPrice(100 / 12, "USD", "en-US")).toBe("$8.33");
  });

  it("uses the narrow local symbol", () => {
    expect(formatPlanPrice("599", "UAH", "uk")).toMatch(/^599\s₴$/);
  });

  it("falls back to a plain rendering for unknown codes", () => {
    expect(formatPlanPrice("5", "ZZZ", "en-US")).toContain("5");
  });

  it("passes through unparseable amounts", () => {
    expect(formatPlanPrice("n/a", "USD", "en-US")).toBe("USD n/a");
  });
});

describe("fromStripeAmount", () => {
  it("converts minor units for two-decimal currencies", () => {
    expect(fromStripeAmount(1999, "usd")).toBe(19.99);
  });

  it("leaves zero-decimal currencies alone", () => {
    expect(fromStripeAmount(500, "JPY")).toBe(500);
  });
});
