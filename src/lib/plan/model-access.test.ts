import { describe, expect, it } from "vitest";
import { findUnlockingPlan, getModelMinTier } from "./model-access";

describe("getModelMinTier", () => {
  const rules = [{ provider: "US", model: "Claude 4", minTier: 2 }];

  it("returns the configured tier for the exact provider and model", () => {
    expect(getModelMinTier(rules, { provider: "US", model: "Claude 4" })).toBe(
      2,
    );
  });

  it("is open (0) for unlisted models, including same name under another provider", () => {
    expect(getModelMinTier(rules, { provider: "US", model: "ChatGPT 5" })).toBe(
      0,
    );
    expect(
      getModelMinTier(rules, { provider: "Next", model: "Claude 4" }),
    ).toBe(0);
  });
});

describe("findUnlockingPlan", () => {
  const plans = [
    { name: "Max", tier: 3, active: true, price: "30.00" },
    { name: "Pro Plus", tier: 2, active: true, price: "25.00" },
    { name: "Pro", tier: 2, active: true, price: "20.00" },
    { name: "Old Pro", tier: 2, active: false, price: "5.00" },
    { name: "Plus", tier: 1, active: true, price: "10.00" },
  ];

  it("picks the lowest qualifying tier, then the cheapest", () => {
    expect(findUnlockingPlan(plans, 2)?.name).toBe("Pro");
    expect(findUnlockingPlan(plans, 1)?.name).toBe("Plus");
  });

  it("ignores archived plans and returns null when nothing qualifies", () => {
    expect(findUnlockingPlan(plans, 3)?.name).toBe("Max");
    expect(findUnlockingPlan(plans, 4)).toBeNull();
  });
});
