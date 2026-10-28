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

export type PricingPlan = Pick<
  Plan,
  | "id"
  | "code"
  | "name"
  | "shortDescription"
  | "description"
  | "features"
  | "price"
  | "annualPrice"
  | "tier"
> & { purchasable: boolean; hasAnnual: boolean };

export type UserSubscriptionSummary = {
  plan: string;
  status: string;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
};
