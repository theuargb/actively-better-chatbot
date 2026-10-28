"use server";

import { validatedActionWithAdminPermission } from "lib/action-utils";
import { modelAccessRepository } from "lib/db/repository";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const UpdateModelAccessSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  minTier: z.coerce.number().int().min(0).max(1000),
});

export const updateModelAccessAction = validatedActionWithAdminPermission(
  UpdateModelAccessSchema,
  async ({ provider, model, minTier }) => {
    try {
      await modelAccessRepository.set(provider, model, minTier);
      revalidatePath("/admin/models");
      return { success: true, message: "Saved" };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to save model access",
      };
    }
  },
);
