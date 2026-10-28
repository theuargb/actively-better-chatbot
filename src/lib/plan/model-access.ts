import type { ChatModel } from "app-types/chat";

export type ModelAccessRule = {
  provider: string;
  model: string;
  minTier: number;
};

/** A model with no rule is open to everyone (tier 0). */
export const getModelMinTier = (
  rules: ModelAccessRule[],
  model: ChatModel,
): number =>
  rules.find((r) => r.provider === model.provider && r.model === model.model)
    ?.minTier ?? 0;

/**
 * The cheapest way to unlock a model: the lowest-tier active plan that meets the
 * requirement, ties broken by price.
 */
export const findUnlockingPlan = <
  T extends { tier: number; active: boolean; price: string },
>(
  plans: T[],
  minTier: number,
): T | null =>
  plans
    .filter((p) => p.active && p.tier >= minTier)
    .sort((a, b) => a.tier - b.tier || Number(a.price) - Number(b.price))[0] ??
  null;

type ModelInfoLike = { name: string };

/**
 * Adds `locked` / `requiredPlanName` to each model for a user at `userTier`.
 * Locked models stay in the list so the picker can show an upgrade prompt.
 */
export const annotateModelLocks = <
  M extends ModelInfoLike,
  P extends { provider: string; models: M[] },
  Plan extends { tier: number; active: boolean; price: string; name: string },
>(
  providers: P[],
  rules: ModelAccessRule[],
  userTier: number,
  plans: Plan[],
): (Omit<P, "models"> & {
  models: (M & { locked: boolean; requiredPlanName: string | null })[];
})[] =>
  providers.map((provider) => ({
    ...provider,
    models: provider.models.map((model) => {
      const minTier = getModelMinTier(rules, {
        provider: provider.provider,
        model: model.name,
      });
      const locked = userTier < minTier;
      return {
        ...model,
        locked,
        requiredPlanName: locked
          ? (findUnlockingPlan(plans, minTier)?.name ?? null)
          : null,
      };
    }),
  }));
