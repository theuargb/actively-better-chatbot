import "server-only";

import type { ChatModel } from "app-types/chat";
import type { EffectivePlan, PricingPlan } from "app-types/plan";
import { isBillingEnabled } from "lib/billing/stripe";
import { customModelProvider } from "lib/ai/models";
import { planRepository } from "lib/db/repository";
import { getPlanCurrency } from "./currency";
import { pickEffectivePlan, planTier } from "./effective-plan";
import { findUnlockingPlan, getModelMinTier } from "./model-access";

export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  const { assigned, subscribed } =
    await planRepository.getEntitlementPlans(userId);
  return pickEffectivePlan(assigned, subscribed);
}

export type ModelAccessResult =
  | { ok: true; plan: EffectivePlan }
  | { ok: false; plan: EffectivePlan; requiredPlanName: string | null };

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
    requiredPlanName: unlocking?.name ?? null,
  };
}

export class ModelLockedError extends Error {
  constructor(
    model: ChatModel,
    readonly requiredPlanName: string | null,
  ) {
    super(`Model ${model.provider}/${model.model} requires a higher plan`);
    this.name = "ModelLockedError";
  }
}

export async function assertModelAccess(userId: string, model?: ChatModel) {
  const { identity } = customModelProvider.resolveModel(model);
  const access = await checkModelAccess(userId, identity);
  if (!access.ok) throw new ModelLockedError(identity, access.requiredPlanName);
}

export async function getPricingPageData(userId: string) {
  const [plans, effectivePlan, subscription] = await Promise.all([
    planRepository.list(false),
    getEffectivePlan(userId),
    planRepository.getActiveSubscription(userId),
  ]);
  const pricingPlans: PricingPlan[] = plans
    .sort((a, b) => a.tier - b.tier || Number(a.price) - Number(b.price))
    .map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      shortDescription: plan.shortDescription,
      description: plan.description,
      features: plan.features,
      price: plan.price,
      annualPrice: plan.annualPrice,
      tier: plan.tier,
      purchasable: Boolean(plan.stripePriceId),
      hasAnnual: Boolean(plan.stripeAnnualPriceId),
    }));
  return {
    plans: pricingPlans,
    effectivePlan: effectivePlan
      ? {
          code: effectivePlan.code,
          name: effectivePlan.name,
          source: effectivePlan.source,
        }
      : null,
    subscription,
    billingEnabled: isBillingEnabled(),
    currency: getPlanCurrency(),
  };
}
