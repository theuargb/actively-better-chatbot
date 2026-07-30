"use server";

import { revalidatePath } from "next/cache";
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
  // Postgres unique_violation on plan.code — the code is the env-key namespace,
  // so collisions have to be surfaced clearly rather than as a raw driver error.
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

const toPlanValues = (data: {
  code: string;
  name: string;
  shortDescription: string;
  description: string;
  features: string;
  price: number;
  active: boolean;
}) => ({
  code: data.code.toLowerCase(),
  name: data.name,
  shortDescription: data.shortDescription,
  description: data.description,
  features: parseFeatures(data.features),
  price: data.price.toFixed(2),
  active: data.active,
});

export const createPlanAction = validatedActionWithAdminPermission(
  CreatePlanSchema,
  async (data): Promise<PlanActionState> => {
    try {
      const plan = await planRepository.create(toPlanValues(data));
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
      const plan = await planRepository.update(id, toPlanValues(data));
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
