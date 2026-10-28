"use server";

import { revalidatePath } from "next/cache";
import { resolveStripePrice } from "lib/billing/stripe";
import { validatedActionWithAdminPermission } from "lib/action-utils";
import { planRepository } from "lib/db/repository";
import {
  CreatePlanSchema,
  PlanActionState,
  UpdatePlanSchema,
  UpdateUserPlanSchema,
  UserPlanActionState,
} from "./plan-validations";

const describeError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : "";
  // Postgres unique_violation. The Stripe price columns come first because the
  // generic 23505 check below would otherwise report them as a code clash.
  if (
    message.includes("plan_stripe_price_id_unique") ||
    message.includes("plan_stripe_annual_price_id_unique")
  ) {
    return "That Stripe price is already used by another plan";
  }
  // The code is the env-key namespace, so collisions have to be surfaced
  // clearly rather than as a raw driver error.
  if (message.includes("plan_code_unique") || message.includes("23505")) {
    return "That plan code is already in use";
  }
  return message || fallback;
};

const parseFeatures = (features: string) =>
  Array.from(
    new Set(
      features
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
    ),
  );

/**
 * A plan sold through Stripe takes its price and currency from Stripe, so what
 * we display can never differ from what Checkout charges. Throws a message an
 * admin can act on.
 */
const toPlanValues = async (data: {
  code: string;
  name: string;
  shortDescription: string;
  description: string;
  features: string;
  price: number;
  currency: string;
  tier: number;
  stripePriceId: string | null;
  stripeAnnualPriceId: string | null;
  active: boolean;
}) => {
  const monthly = data.stripePriceId
    ? await resolveStripePrice(data.stripePriceId, "month")
    : null;
  const annual = data.stripeAnnualPriceId
    ? await resolveStripePrice(data.stripeAnnualPriceId, "year")
    : null;
  if (monthly && annual && annual.currency !== monthly.currency) {
    throw new Error(
      `Annual price is in ${annual.currency}, but the monthly price is in ${monthly.currency}`,
    );
  }
  return {
    code: data.code.toLowerCase(),
    name: data.name,
    shortDescription: data.shortDescription,
    description: data.description,
    features: parseFeatures(data.features),
    price: monthly?.amount ?? data.price.toFixed(2),
    currency: monthly?.currency ?? data.currency,
    annualPrice: annual?.amount ?? null,
    tier: data.tier,
    stripePriceId: data.stripePriceId,
    stripeAnnualPriceId: data.stripeAnnualPriceId,
    active: data.active,
  };
};

export const createPlanAction = validatedActionWithAdminPermission(
  CreatePlanSchema,
  async (data): Promise<PlanActionState> => {
    try {
      const plan = await planRepository.create(await toPlanValues(data));
      revalidatePath("/admin/plans");
      return { success: true, message: "Plan created", plan };
    } catch (error) {
      return {
        success: false,
        message: describeError(error, "Unable to create plan"),
      };
    }
  },
);

export const updatePlanAction = validatedActionWithAdminPermission(
  UpdatePlanSchema,
  async ({ id, ...data }): Promise<PlanActionState> => {
    try {
      const existing = await planRepository.getById(id);
      if (!existing) return { success: false, message: "Plan not found" };
      // Subscriptions store the plan code, so it must not move once sold.
      if (existing.stripePriceId && existing.code !== data.code.toLowerCase()) {
        return {
          success: false,
          message:
            "Plan code can't change once the plan is sold through Stripe",
        };
      }
      const plan = await planRepository.update(id, await toPlanValues(data));
      if (!plan) return { success: false, message: "Plan not found" };
      revalidatePath("/admin/plans");
      revalidatePath("/admin/users");
      return { success: true, message: "Plan updated", plan };
    } catch (error) {
      return {
        success: false,
        message: describeError(error, "Unable to update plan"),
      };
    }
  },
);

export const updateUserPlanAction = validatedActionWithAdminPermission(
  UpdateUserPlanSchema,
  async ({ userId, planId }): Promise<UserPlanActionState> => {
    if (planId) {
      const plan = await planRepository.getById(planId);
      if (!plan) return { success: false, message: "Plan not found" };
      // Archived plans keep working for whoever already holds them, but they are
      // closed to new assignments.
      if (
        !plan.active &&
        (await planRepository.getAssignedPlanId(userId)) !== planId
      ) {
        return {
          success: false,
          message: "This plan is archived and can no longer be assigned",
        };
      }
    }
    const user = await planRepository.assignToUser(userId, planId);
    if (!user) return { success: false, message: "User not found" };
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/users");
    return { success: true, message: "User plan updated", ...user };
  },
);
