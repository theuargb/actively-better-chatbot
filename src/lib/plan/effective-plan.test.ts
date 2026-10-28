import { describe, expect, it } from "vitest";
import type { Plan } from "app-types/plan";
import { pickEffectivePlan, planTier } from "./effective-plan";

const plan = (code: string, tier: number): Plan => ({
  id: code,
  code,
  name: code,
  shortDescription: "",
  description: "",
  features: [],
  price: "10.00",
  currency: "USD",
  annualPrice: null,
  tier,
  stripePriceId: null,
  stripeAnnualPriceId: null,
  active: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("pickEffectivePlan", () => {
  it("prefers the higher tier even when it is only assigned", () => {
    const result = pickEffectivePlan(plan("max", 2), plan("pro", 1));
    expect(result).toMatchObject({ code: "max", source: "assigned" });
  });

  it("prefers the paid subscription on a tie", () => {
    const result = pickEffectivePlan(plan("comp", 1), plan("pro", 1));
    expect(result).toMatchObject({ code: "pro", source: "subscription" });
  });

  it("falls back to whichever exists", () => {
    expect(pickEffectivePlan(plan("comp", 1), null)?.source).toBe("assigned");
    expect(pickEffectivePlan(null, plan("pro", 1))?.source).toBe(
      "subscription",
    );
    expect(pickEffectivePlan(null, null)).toBeNull();
  });
});

describe("planTier", () => {
  it("treats no plan as tier 0", () => {
    expect(planTier(null)).toBe(0);
    expect(planTier(pickEffectivePlan(plan("pro", 2), null))).toBe(2);
  });
});
