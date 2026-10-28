import { describe, expect, it } from "vitest";
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  UpdateUserPlanSchema,
} from "./plan-validations";

const validPlan = {
  code: "plus",
  name: "Plus",
  shortDescription: "For regulars",
  description: "A fuller description",
  features: "Priority models\nLonger chats",
  price: "19.00",
  active: "true",
};

describe("CreatePlanSchema", () => {
  it("accepts a well-formed plan", () => {
    const result = CreatePlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(19);
      expect(result.data.active).toBe(true);
    }
  });

  it("coerces the active flag from its form value", () => {
    const result = CreatePlanSchema.safeParse({
      ...validPlan,
      active: "false",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.active).toBe(false);
  });

  it("defaults the tier to 1 and coerces a submitted tier", () => {
    const result = CreatePlanSchema.safeParse(validPlan);
    expect(result.success && result.data.tier).toBe(1);
    const tiered = CreatePlanSchema.safeParse({ ...validPlan, tier: "3" });
    expect(tiered.success && tiered.data.tier).toBe(3);
    expect(
      CreatePlanSchema.safeParse({ ...validPlan, tier: "-1" }).success,
    ).toBe(false);
    expect(
      CreatePlanSchema.safeParse({ ...validPlan, tier: "1.5" }).success,
    ).toBe(false);
  });

  it("turns blank Stripe price ids into null and rejects malformed ones", () => {
    const blank = CreatePlanSchema.safeParse({
      ...validPlan,
      stripePriceId: "",
    });
    expect(blank.success && blank.data.stripePriceId).toBeNull();
    const ok = CreatePlanSchema.safeParse({
      ...validPlan,
      stripePriceId: "price_1Abc",
    });
    expect(ok.success && ok.data.stripePriceId).toBe("price_1Abc");
    expect(
      CreatePlanSchema.safeParse({ ...validPlan, stripePriceId: "prod_1Abc" })
        .success,
    ).toBe(false);
  });

  it("requires a monthly Stripe price for an annual one", () => {
    const result = CreatePlanSchema.safeParse({
      ...validPlan,
      stripeAnnualPriceId: "price_1Year",
    });
    expect(result.success).toBe(false);
    expect(
      CreatePlanSchema.safeParse({
        ...validPlan,
        stripePriceId: "price_1Month",
        stripeAnnualPriceId: "price_1Year",
      }).success,
    ).toBe(true);
  });

  it("requires a code", () => {
    expect(CreatePlanSchema.safeParse({ ...validPlan, code: "" }).success).toBe(
      false,
    );
  });

  it("rejects codes with characters that are not key-safe", () => {
    for (const code of ["pro plan", "pro.plan", "pro/plan", "pro+"]) {
      expect(CreatePlanSchema.safeParse({ ...validPlan, code }).success).toBe(
        false,
      );
    }
  });

  it("allows hyphens and underscores in codes", () => {
    for (const code of ["pro-plan", "pro_plan", "pro-1_x"]) {
      expect(CreatePlanSchema.safeParse({ ...validPlan, code }).success).toBe(
        true,
      );
    }
  });

  it("requires a name", () => {
    expect(CreatePlanSchema.safeParse({ ...validPlan, name: "" }).success).toBe(
      false,
    );
  });

  it("rejects a negative price", () => {
    const result = CreatePlanSchema.safeParse({ ...validPlan, price: "-1" });
    expect(result.success).toBe(false);
  });

  it("accepts a zero price", () => {
    const result = CreatePlanSchema.safeParse({ ...validPlan, price: "0" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.price).toBe(0);
  });

  it("rejects a non-numeric price", () => {
    expect(
      CreatePlanSchema.safeParse({ ...validPlan, price: "free" }).success,
    ).toBe(false);
  });

  it("defaults the optional descriptions", () => {
    const result = CreatePlanSchema.safeParse({
      code: "basic",
      name: "Basic",
      price: "0",
      active: "true",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shortDescription).toBe("");
      expect(result.data.description).toBe("");
      expect(result.data.features).toBe("");
    }
  });
});

describe("UpdatePlanSchema", () => {
  it("requires a uuid id", () => {
    expect(
      UpdatePlanSchema.safeParse({ ...validPlan, id: "not-a-uuid" }).success,
    ).toBe(false);
    expect(
      UpdatePlanSchema.safeParse({
        ...validPlan,
        id: "1f1b2b3c-4d5e-4f60-8a91-2b3c4d5e6f70",
      }).success,
    ).toBe(true);
  });
});

describe("UpdateUserPlanSchema", () => {
  const userId = "1f1b2b3c-4d5e-4f60-8a91-2b3c4d5e6f70";
  const planId = "2a2b3c4d-5e6f-4a70-9b81-3c4d5e6f7081";

  it("accepts a plan assignment", () => {
    const result = UpdateUserPlanSchema.safeParse({ userId, planId });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.planId).toBe(planId);
  });

  it("treats an empty plan id as clearing the plan", () => {
    const result = UpdateUserPlanSchema.safeParse({ userId, planId: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.planId).toBeNull();
  });

  it("rejects a malformed plan id", () => {
    expect(
      UpdateUserPlanSchema.safeParse({ userId, planId: "none" }).success,
    ).toBe(false);
  });
});
