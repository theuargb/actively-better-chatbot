import { describe, expect, it } from "vitest";
import type {
  Plan,
  PricingView,
  UserSubscriptionSummary,
} from "app-types/plan";
import {
  buildPricingView,
  FREE_CARD_ID,
  type PricingViewInput,
} from "./pricing-view";

const plan = (
  overrides: Partial<Plan> & Pick<Plan, "code" | "tier">,
): Plan => ({
  id: overrides.code,
  name: overrides.code,
  shortDescription: "",
  description: "",
  features: [],
  price: "10.00",
  annualPrice: null,
  stripePriceId: null,
  stripeAnnualPriceId: null,
  active: true,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

const plus = plan({
  code: "plus",
  name: "Plus",
  tier: 1,
  price: "10.00",
  annualPrice: "100.00",
  stripePriceId: "price_plus",
  stripeAnnualPriceId: "price_plus_y",
});
const pro = plan({
  code: "pro",
  name: "Pro",
  tier: 2,
  price: "30.00",
  stripePriceId: "price_pro",
});

const models = [
  { provider: "openai", name: "gpt-4.1-mini", minTier: 0 },
  { provider: "openai", name: "gpt-4.1", minTier: 1 },
  { provider: "openai", name: "o4-mini", minTier: 2 },
];
const names = (list: { name: string }[]) => list.map((m) => m.name);

const subscription = (
  overrides: Partial<UserSubscriptionSummary> = {},
): UserSubscriptionSummary => ({
  plan: "pro",
  status: "active",
  periodEnd: new Date("2026-12-01"),
  cancelAtPeriodEnd: false,
  stripeSubscriptionId: "sub_1",
  ...overrides,
});

const build = (overrides: Partial<PricingViewInput> = {}) =>
  buildPricingView({
    plans: [pro, plus],
    assigned: null,
    subscribed: null,
    subscription: null,
    models,
    billingEnabled: true,
    free: { name: "Free", description: "Basics" },
    ...overrides,
  });

const card = (view: PricingView, id: string) =>
  view.cards.find((c) => c.id === id)!;

describe("buildPricingView", () => {
  it("sells the next tier to a user without a plan", () => {
    const view = build();

    expect(view.cards.map((c) => c.id)).toEqual([FREE_CARD_ID, "plus", "pro"]);
    expect(view.current).toEqual({ name: "Free", source: "free" });

    const free = card(view, FREE_CARD_ID);
    expect(free.action).toBe("current");
    expect(names(free.unlockedModels)).toEqual(["gpt-4.1-mini"]);

    const plusCard = card(view, "plus");
    expect(plusCard).toMatchObject({
      action: "upgrade",
      recommended: true,
      includesName: "Free",
    });
    expect(names(plusCard.unlockedModels)).toEqual(["gpt-4.1"]);

    const proCard = card(view, "pro");
    expect(proCard).toMatchObject({ action: "upgrade", recommended: false });
    expect(names(proCard.unlockedModels)).toEqual(["o4-mini"]);

    expect(view.annualSavingsPercent).toBe(17);
  });

  it("uses an active tier-0 plan instead of synthesizing Free", () => {
    const basic = plan({ code: "basic", name: "Basic", tier: 0, price: "0" });
    const view = build({ plans: [plus, basic] });

    expect(view.cards.map((c) => c.id)).toEqual(["basic", "plus"]);
    expect(card(view, "plus").includesName).toBe("Basic");
  });

  it("drops inactive plans", () => {
    const view = build({ plans: [plus, { ...pro, active: false }] });
    expect(view.cards.map((c) => c.id)).toEqual([FREE_CARD_ID, "plus"]);
  });

  it("offers nothing to buy while billing is disabled", () => {
    const view = build({ billingEnabled: false });

    expect(card(view, "plus").action).toBe("contact");
    expect(card(view, "pro").action).toBe("contact");
    expect(view.cards.some((c) => c.recommended)).toBe(false);
  });

  it("lets a subscriber switch down or cancel, listing what cancelling loses", () => {
    const view = build({ subscribed: pro, subscription: subscription() });

    expect(view.current).toEqual({ name: "Pro", source: "subscription" });
    expect(card(view, FREE_CARD_ID).action).toBe("cancel");
    expect(card(view, "plus").action).toBe("switch");
    expect(card(view, "pro").action).toBe("current");
    expect(view.cancelTargetName).toBe("Free");
    expect(names(view.cancelLosesModels)).toEqual(["gpt-4.1", "o4-mini"]);
  });

  it("falls back to the assigned plan when a subscriber cancels", () => {
    const view = build({
      assigned: plus,
      subscribed: pro,
      subscription: subscription(),
    });

    expect(view.cancelTargetName).toBe("Plus");
    expect(names(view.cancelLosesModels)).toEqual(["o4-mini"]);
  });

  it("does not offer cancel again once cancellation is scheduled", () => {
    const view = build({
      subscribed: pro,
      subscription: subscription({ cancelAtPeriodEnd: true }),
    });
    expect(card(view, FREE_CARD_ID).action).toBe("none");
  });

  it("offers no downgrade on an admin-assigned plan", () => {
    const view = build({ assigned: pro });

    expect(view.current).toEqual({ name: "Pro", source: "assigned" });
    expect(card(view, FREE_CARD_ID).action).toBe("none");
    expect(card(view, "plus").action).toBe("none");
  });

  it("reports no annual savings without annual prices", () => {
    expect(build({ plans: [pro] }).annualSavingsPercent).toBeNull();
  });
});
