import { describe, expect, it } from "vitest";
import { pickLimitOffer } from "./upgrade-offer";

const plan = (
  code: string,
  tier: number,
  price: string,
  extra: { active?: boolean; stripePriceId?: string | null } = {},
) => ({
  code,
  name: code.toUpperCase(),
  tier,
  price,
  active: extra.active ?? true,
  stripePriceId:
    extra.stripePriceId === undefined ? `price_${code}` : extra.stripePriceId,
});

const limits: Record<string, number | undefined> = {
  plus: 50,
  team: 50,
  pro: 200,
  ultra: undefined,
};

const pick = (
  plans: ReturnType<typeof plan>[],
  opts: Partial<Parameters<typeof pickLimitOffer>[1]> = {},
) =>
  pickLimitOffer(plans, {
    currentTier: 0,
    currentLimit: 10,
    billingEnabled: true,
    limitFor: (p) => limits[p.code],
    ...opts,
  });

describe("pickLimitOffer", () => {
  it("offers the cheapest higher tier that raises the limit", () => {
    const offer = pick([
      plan("pro", 2, "30"),
      plan("team", 1, "20"),
      plan("plus", 1, "10"),
    ]);
    expect(offer).toEqual({
      plan: { code: "plus", name: "PLUS", purchasable: true },
      limit: 50,
    });
  });

  it("skips plans that would not raise the limit", () => {
    expect(
      pick([plan("plus", 1, "10"), plan("pro", 2, "30")], {
        currentLimit: 50,
      })?.plan.code,
    ).toBe("pro");
  });

  it("reports a plan without a configured limit as lifting it", () => {
    expect(pick([plan("ultra", 3, "99")])).toMatchObject({ limit: null });
  });

  it("ignores inactive plans and tiers at or below the user's", () => {
    expect(
      pick([plan("plus", 1, "10", { active: false }), plan("team", 1, "20")], {
        currentTier: 1,
      }),
    ).toBeNull();
  });

  it("prefers a purchasable plan, else falls back to one on request", () => {
    const plans = [
      plan("plus", 1, "10", { stripePriceId: null }),
      plan("pro", 2, "30"),
    ];
    expect(pick(plans)?.plan).toMatchObject({ code: "pro", purchasable: true });
    expect(pick(plans, { billingEnabled: false })?.plan).toMatchObject({
      code: "plus",
      purchasable: false,
    });
  });
});
