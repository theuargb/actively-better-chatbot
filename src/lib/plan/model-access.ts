import type { ChatModel } from "app-types/chat";
import { modelConfigKey, readJsonEnv } from "lib/env-json";
import { z } from "zod";

const ModelMinTiersSchema = z.record(
  z.string().includes("/"),
  z.number().int().nonnegative(),
);

/** `AI_MODEL_MIN_TIERS`: "<provider>/<model>" -> minimum plan tier. */
export const getModelMinTiers = () =>
  readJsonEnv("AI_MODEL_MIN_TIERS", ModelMinTiersSchema, {});

/** A model with no entry is open to everyone (tier 0). */
export const getModelMinTier = (model: ChatModel): number =>
  getModelMinTiers()[modelConfigKey(model)] ?? 0;

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
  userTier: number,
  plans: Plan[],
): (Omit<P, "models"> & {
  models: (M & { locked: boolean; requiredPlanName: string | null })[];
})[] =>
  providers.map((provider) => ({
    ...provider,
    models: provider.models.map((model) => {
      const minTier = getModelMinTier({
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
