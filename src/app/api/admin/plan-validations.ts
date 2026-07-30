import { z } from "zod";
import { ActionState } from "lib/action-utils";
import { Plan } from "app-types/plan";

const planCode = z
  .string()
  .trim()
  .min(1, "Plan code is required")
  .max(64)
  .regex(
    /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i,
    "Use letters, numbers, hyphens, or underscores",
  );

const planFields = {
  code: planCode,
  name: z.string().trim().min(1, "Plan name is required").max(120),
  shortDescription: z.string().trim().max(280).default(""),
  description: z.string().trim().max(10_000).default(""),
  features: z.string().default(""),
  price: z.coerce.number().finite().min(0, "Price cannot be negative"),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
};

export const CreatePlanSchema = z.object(planFields);
export const UpdatePlanSchema = z.object({ id: z.uuid(), ...planFields });
export const UpdateUserPlanSchema = z.object({
  userId: z.uuid(),
  planId: z
    .union([z.uuid(), z.literal("")])
    .transform((value) => value || null),
});

export type PlanActionState = ActionState & { plan?: Plan | null };
export type UserPlanActionState = ActionState & {
  userId?: string;
  planId?: string | null;
};
