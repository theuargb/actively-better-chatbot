import "server-only";

import type { ChatModel } from "app-types/chat";
import type {
  EffectivePlan,
  PricingView,
  UserPlanSummary,
  UserSubscriptionSummary,
} from "app-types/plan";
import { isBillingEnabled } from "lib/billing/stripe";
import { customModelProvider } from "lib/ai/models";
import { planRepository } from "lib/db/repository";
import { pickEffectivePlan, planTier } from "./effective-plan";
import { getMaxChatLength, getWindowLimit } from "lib/ai/rate-limit";
import type { RateLimitWindow } from "lib/ai/rate-limit-message";
import { findUnlockingPlan, getModelMinTier } from "./model-access";
import { buildPricingView } from "./pricing-view";
import {
  type LimitOffer,
  type PlanOffer,
  pickLimitOffer,
  toPlanOffer,
} from "./upgrade-offer";

export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  const { assigned, subscribed } =
    await planRepository.getEntitlementPlans(userId);
  return pickEffectivePlan(assigned, subscribed);
}

export type ModelAccessResult =
  | { ok: true; plan: EffectivePlan }
  | { ok: false; plan: EffectivePlan; requiredPlan: PlanOffer | null };

/**
 * `identity` must already be resolved (see customModelProvider.resolveModel) so
 * an unknown model is judged as the fallback model that will actually serve it.
 * Pass `plan` when the caller already loaded it.
 */
export async function checkModelAccess(
  userId: string,
  identity: ChatModel,
  plan?: EffectivePlan,
): Promise<ModelAccessResult> {
  const effectivePlan =
    plan === undefined ? await getEffectivePlan(userId) : plan;
  const minTier = getModelMinTier(identity);
  if (planTier(effectivePlan) >= minTier) {
    return { ok: true, plan: effectivePlan };
  }
  const unlocking = findUnlockingPlan(
    await planRepository.list(false),
    minTier,
  );
  return {
    ok: false,
    plan: effectivePlan,
    requiredPlan: unlocking ? toPlanOffer(unlocking, isBillingEnabled()) : null,
  };
}

export class ModelLockedError extends Error {
  constructor(
    model: ChatModel,
    readonly requiredPlan: PlanOffer | null,
  ) {
    super(`Model ${model.provider}/${model.model} requires a higher plan`);
    this.name = "ModelLockedError";
  }
}

export async function assertModelAccess(userId: string, model?: ChatModel) {
  const { identity } = customModelProvider.resolveModel(model);
  const access = await checkModelAccess(userId, identity);
  if (!access.ok) throw new ModelLockedError(identity, access.requiredPlan);
}

/**
 * The plan to propose when a user hits `currentLimit`: the cheapest higher tier
 * whose configured limit (hourly, daily, or chat length) is actually higher.
 */
export async function getLimitOffer(
  context: {
    plan: EffectivePlan;
    roles: string[];
    model: ChatModel;
  },
  kind: RateLimitWindow | "thread",
  currentLimit: number,
): Promise<LimitOffer | null> {
  return pickLimitOffer(await planRepository.list(false), {
    currentTier: planTier(context.plan),
    currentLimit,
    billingEnabled: isBillingEnabled(),
    limitFor: (candidate) => {
      const scopes = {
        roles: context.roles,
        planCode: candidate.code,
        model: context.model,
      };
      return kind === "thread"
        ? getMaxChatLength(scopes)
        : getWindowLimit(scopes, kind);
    },
  });
}

export type PricingPageData = {
  view: PricingView;
  subscription: UserSubscriptionSummary | null;
  billingEnabled: boolean;
};

/** `free` carries the localized name/description of the synthesized Free card. */
export async function getPricingPageData(
  userId: string,
  free: { name: string; description: string },
): Promise<PricingPageData> {
  const [plans, { assigned, subscribed }, subscription] = await Promise.all([
    planRepository.list(false),
    planRepository.getEntitlementPlans(userId),
    planRepository.getActiveSubscription(userId),
  ]);
  const billingEnabled = isBillingEnabled();
  const models = customModelProvider.modelsInfo
    .filter((p) => p.hasAPIKey)
    .flatMap((p) =>
      p.models.map((m) => ({
        provider: p.provider,
        name: m.name,
        minTier: getModelMinTier({ provider: p.provider, model: m.name }),
      })),
    );
  return {
    view: buildPricingView({
      plans,
      assigned,
      subscribed,
      subscription,
      models,
      billingEnabled,
      free,
    }),
    subscription,
    billingEnabled,
  };
}

/** What the user menu shows: the plan name and whether a paid upgrade exists. */
export async function getUserPlanSummary(
  userId: string,
): Promise<UserPlanSummary> {
  const effective = await getEffectivePlan(userId);
  const canUpgrade =
    isBillingEnabled() &&
    (await planRepository.list(false)).some(
      (p) => p.stripePriceId && p.tier > planTier(effective),
    );
  return { planName: effective?.name ?? null, canUpgrade };
}
