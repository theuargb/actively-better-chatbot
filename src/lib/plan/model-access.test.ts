import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findUnlockingPlan,
  getModelMinTier,
  annotateModelLocks,
} from "./model-access";

const setTiers = (tiers: Record<string, number>) =>
  vi.stubEnv("AI_MODEL_MIN_TIERS", JSON.stringify(tiers));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getModelMinTier", () => {
  it("returns the configured tier for the exact provider and model", () => {
    setTiers({ "US/Claude 4": 2 });
    expect(getModelMinTier({ provider: "US", model: "Claude 4" })).toBe(2);
  });

  it("is open (0) for unlisted models, including same name under another provider", () => {
    setTiers({ "US/Claude 4": 2 });
    expect(getModelMinTier({ provider: "US", model: "ChatGPT 5" })).toBe(0);
    expect(getModelMinTier({ provider: "Next", model: "Claude 4" })).toBe(0);
  });

  it("keeps Cyrillic model names apart", () => {
    setTiers({ "Еней/Юрист Еней": 1 });
    expect(getModelMinTier({ provider: "Еней", model: "Юрист Еней" })).toBe(1);
    expect(getModelMinTier({ provider: "Еней", model: "Поет Еней" })).toBe(0);
  });

  it("throws on a negative tier instead of silently opening the model", () => {
    setTiers({ "US/Claude 4": -1 });
    expect(() =>
      getModelMinTier({ provider: "US", model: "Claude 4" }),
    ).toThrow(/AI_MODEL_MIN_TIERS is invalid/);
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

  it("locks only models above the user's tier and names the cheapest unlocking plan", () => {
    setTiers({ "openai/gpt-b": 2, "openai/gone": 9 });
    const [{ models }] = annotateModelLocks(providers, 1, plans);
    expect(models[0]).toMatchObject({ locked: false, requiredPlanName: null });
    expect(models[1]).toMatchObject({ locked: true, requiredPlanName: "Pro" });
  });

  it("unlocks at exactly the required tier", () => {
    setTiers({ "openai/gpt-b": 2 });
    const [{ models }] = annotateModelLocks(providers, 2, plans);
    expect(models.every((m) => !m.locked)).toBe(true);
  });

  it("reports no unlocking plan when none qualifies", () => {
    setTiers({ "openai/gpt-a": 3 });
    const [{ models }] = annotateModelLocks(providers, 0, plans);
    expect(models[0]).toMatchObject({ locked: true, requiredPlanName: null });
  });
});
