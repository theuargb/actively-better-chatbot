import type {
  Plan,
  PricingCard,
  PricingModel,
  PricingView,
  UserSubscriptionSummary,
} from "app-types/plan";
import { DEFAULT_PLAN_CURRENCY } from "./currency";
import { pickEffectivePlan, planTier } from "./effective-plan";

export const FREE_CARD_ID = "free";

export type PricingViewInput = {
  /** Any plans; inactive ones are dropped here. */
  plans: Plan[];
  assigned: Plan | null;
  subscribed: Plan | null;
  subscription: UserSubscriptionSummary | null;
  /** Models with an API key, in picker order. */
  models: Array<PricingModel & { minTier: number }>;
  billingEnabled: boolean;
  free: { name: string; description: string };
};

/**
 * Everything the pricing page renders, derived from plans, the user's
 * entitlements and the configured model tiers. Pure so every card state can be
 * tested without a DB or env.
 */
export function buildPricingView(input: PricingViewInput): PricingView {
  const { assigned, subscription, models, billingEnabled, free } = input;
  const effective = pickEffectivePlan(assigned, input.subscribed);
  const currentTier = planTier(effective);
  const modelsBetween = (aboveTier: number, upToTier: number): PricingModel[] =>
    models
      .filter((m) => m.minTier > aboveTier && m.minTier <= upToTier)
      .map(({ provider, name }) => ({ provider, name }));

  const active = input.plans
    .filter((p) => p.active)
    .sort((a, b) => a.tier - b.tier || Number(a.price) - Number(b.price));

  type BaseCard = Omit<
    PricingCard,
    "includesName" | "unlockedModels" | "recommended" | "action"
  >;
  const bases: BaseCard[] = active.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    shortDescription: p.shortDescription,
    features: p.features,
    tier: p.tier,
    price: p.price,
    annualPrice: p.annualPrice,
    currency: p.currency,
    hasAnnual: Boolean(p.stripeAnnualPriceId) && p.annualPrice != null,
    purchasable: billingEnabled && Boolean(p.stripePriceId),
  }));
  if (!active.some((p) => p.tier === 0)) {
    bases.unshift({
      id: FREE_CARD_ID,
      code: null,
      name: free.name,
      shortDescription: free.description,
      features: [],
      tier: 0,
      price: "0",
      annualPrice: null,
      currency: active[0]?.currency ?? DEFAULT_PLAN_CURRENCY,
      hasAnnual: false,
      purchasable: false,
    });
  }

  const canManageSubscription =
    subscription !== null &&
    effective?.source === "subscription" &&
    billingEnabled;

  const actionFor = (card: BaseCard): PricingCard["action"] => {
    const isCurrent = effective
      ? card.code === effective.code
      : card.id === FREE_CARD_ID;
    if (isCurrent) return "current";
    if (card.tier > currentTier) {
      return card.purchasable ? "upgrade" : "contact";
    }
    if (canManageSubscription) {
      if (card.id === FREE_CARD_ID) {
        return subscription.cancelAtPeriodEnd ? "none" : "cancel";
      }
      return card.purchasable ? "switch" : "none";
    }
    return "none";
  };

  let recommendedTaken = false;
  const cards: PricingCard[] = bases.map((card) => {
    const previous = bases.filter((b) => b.tier < card.tier).at(-1);
    const action = actionFor(card);
    const recommended = action === "upgrade" && !recommendedTaken;
    if (recommended) recommendedTaken = true;
    return {
      ...card,
      includesName: previous?.name ?? null,
      unlockedModels: modelsBetween(previous?.tier ?? -1, card.tier),
      recommended,
      action,
    };
  });

  const savings = cards
    .filter((c) => c.hasAnnual && Number(c.price) > 0)
    .map((c) =>
      Math.round((1 - Number(c.annualPrice) / (12 * Number(c.price))) * 100),
    );
  const bestSavings = savings.length ? Math.max(...savings) : 0;

  return {
    current: effective
      ? { name: effective.name, source: effective.source }
      : { name: free.name, source: "free" },
    cards,
    cancelTargetName: assigned?.name ?? free.name,
    cancelLosesModels: modelsBetween(assigned?.tier ?? 0, currentTier),
    annualSavingsPercent: bestSavings > 0 ? bestSavings : null,
  };
}
