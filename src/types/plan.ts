import type { PlanEntity } from "lib/db/pg/schema.pg";

export type Plan = PlanEntity;
export type PlanSummary = Pick<
  Plan,
  "id" | "code" | "name" | "active" | "tier"
>;

/** The plan that governs a user right now: a paid subscription or an admin assignment. */
export type EffectivePlan =
  | (Plan & { source: "subscription" | "assigned" })
  | null;

export type PricingModel = { provider: string; name: string };

export type PricingCardAction =
  | "current"
  | "upgrade"
  | "switch"
  | "cancel"
  | "contact"
  | "none";

export type PricingCard = {
  /** Plan id, or FREE_CARD_ID for the synthesized Free card. */
  id: string;
  /** null only for the synthesized Free card. */
  code: string | null;
  name: string;
  shortDescription: string;
  features: string[];
  tier: number;
  /** Monthly price; "0" for the synthesized Free card. */
  price: string;
  annualPrice: string | null;
  hasAnnual: boolean;
  purchasable: boolean;
  /** Renders "Everything in {includesName}, plus:". */
  includesName: string | null;
  unlockedModels: PricingModel[];
  recommended: boolean;
  action: PricingCardAction;
};

export type PricingView = {
  current: { name: string; source: "subscription" | "assigned" | "free" };
  cards: PricingCard[];
  cancelTargetName: string;
  cancelLosesModels: PricingModel[];
  annualSavingsPercent: number | null;
};

export type UserPlanSummary = {
  /** null = no plan; the client renders Pricing.freePlanName. */
  planName: string | null;
  canUpgrade: boolean;
};

export type UserSubscriptionSummary = {
  plan: string;
  status: string;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
};
