import { describe, expect, it } from "vitest";
import {
  findUnlockingPlan,
  getModelMinTier,
  annotateModelLocks,
} from "./model-access";

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

describe("annotateModelLocks", () => {
  const providers = [
    { provider: "openai", models: [{ name: "gpt-a" }, { name: "gpt-b" }] },
  ];
  const plans = [
    { name: "Plus", tier: 1, active: true, price: "10" },
    { name: "Pro", tier: 2, active: true, price: "30" },
    { name: "Old", tier: 3, active: false, price: "5" },
  ];
  const rules = [
    { provider: "openai", model: "gpt-b", minTier: 2 },
    { provider: "openai", model: "gone", minTier: 9 },
  ];

  it("locks only models above the user's tier and names the cheapest unlocking plan", () => {
    const [{ models }] = annotateModelLocks(providers, rules, 1, plans);
    expect(models[0]).toMatchObject({ locked: false, requiredPlanName: null });
    expect(models[1]).toMatchObject({ locked: true, requiredPlanName: "Pro" });
  });

  it("unlocks at exactly the required tier", () => {
    const [{ models }] = annotateModelLocks(providers, rules, 2, plans);
    expect(models.every((m) => !m.locked)).toBe(true);
  });

  it("reports no unlocking plan when none qualifies", () => {
    const [{ models }] = annotateModelLocks(
      providers,
      [{ provider: "openai", model: "gpt-a", minTier: 3 }],
      0,
      plans,
    );
    expect(models[0]).toMatchObject({ locked: true, requiredPlanName: null });
  });
});
