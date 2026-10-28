import type { EffectivePlan, Plan } from "app-types/plan";

/**
 * The higher tier wins; on a tie the paid subscription wins, so the pricing page
 * shows what the user is actually paying for.
 */
export const pickEffectivePlan = (
  assigned: Plan | null,
  subscribed: Plan | null,
): EffectivePlan => {
  if (subscribed && (!assigned || subscribed.tier >= assigned.tier)) {
    return { ...subscribed, source: "subscription" };
  }
  if (assigned) return { ...assigned, source: "assigned" };
  return null;
};

/** Users without a plan are tier 0. */
export const planTier = (plan: EffectivePlan) => plan?.tier ?? 0;
