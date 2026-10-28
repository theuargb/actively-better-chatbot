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

const stripePriceId = z
  .string()
  .trim()
  .regex(/^price_[A-Za-z0-9]+$/, "Expected a Stripe price ID (price_…)")
  .or(z.literal(""))
  .default("")
  .transform((value) => value || null);

const planFields = {
  code: planCode,
  name: z.string().trim().min(1, "Plan name is required").max(120),
  shortDescription: z.string().trim().max(280).default(""),
  description: z.string().trim().max(10_000).default(""),
  features: z.string().default(""),
  price: z.coerce.number().finite().min(0, "Price cannot be negative"),
  tier: z.coerce.number().int().min(0).max(1000).default(1),
  stripePriceId,
  stripeAnnualPriceId: stripePriceId,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
};

const requireMonthlyForAnnual = (
  data: { stripePriceId: string | null; stripeAnnualPriceId: string | null },
  ctx: z.RefinementCtx,
) => {
  if (data.stripeAnnualPriceId && !data.stripePriceId) {
    ctx.addIssue({
      code: "custom",
      message: "Annual price requires a monthly price",
      path: ["stripeAnnualPriceId"],
    });
  }
};

export const CreatePlanSchema = z
  .object(planFields)
  .superRefine(requireMonthlyForAnnual);
export const UpdatePlanSchema = z
  .object({ id: z.uuid(), ...planFields })
  .superRefine(requireMonthlyForAnnual);
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
