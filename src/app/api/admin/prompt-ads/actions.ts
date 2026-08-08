"use server";

import { requireAdminPermission } from "lib/auth/permissions";
import { getSession } from "auth/server";
import { promptAdRepository } from "lib/db/repository";
import {
  PromptAd,
  PromptAdCreateSchema,
  PromptAdListQuery,
  PromptAdListResult,
  PromptAdUpdateSchema,
} from "app-types/prompt-ad";
import { invalidatePromptAdsCache } from "lib/prompt-ad/server";
import { revalidatePath } from "next/cache";
import logger from "logger";
import { errorToString } from "lib/utils";

export type PromptAdActionResult =
  | { success: true; ad: PromptAd }
  | { success: false; message: string };

const ADMIN_PATH = "/admin/prompt-ads";

async function requireAdminUserId(): Promise<string> {
  await requireAdminPermission("manage prompt ads");
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function listPromptAdsAction(
  query?: PromptAdListQuery,
): Promise<PromptAdListResult> {
  await requireAdminPermission("list prompt ads");
  return promptAdRepository.selectList(query);
}

export async function getPromptAdAction(id: string): Promise<PromptAd | null> {
  await requireAdminPermission("view prompt ads");
  return promptAdRepository.selectById(id);
}

export async function createPromptAdAction(
  input: unknown,
): Promise<PromptAdActionResult> {
  try {
    const userId = await requireAdminUserId();
    const parsed = PromptAdCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const ad = await promptAdRepository.create({
      ...parsed.data,
      createdBy: userId,
    });
    await invalidatePromptAdsCache();
    revalidatePath(ADMIN_PATH);
    return { success: true, ad };
  } catch (error) {
    logger.error("Failed to create prompt ad", error);
    return { success: false, message: errorToString(error) };
  }
}

export async function updatePromptAdAction(
  input: unknown,
): Promise<PromptAdActionResult> {
  try {
    await requireAdminUserId();
    const parsed = PromptAdUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const existing = await promptAdRepository.selectById(parsed.data.id);
    if (!existing) {
      return { success: false, message: "Prompt ad not found" };
    }

    const ad = await promptAdRepository.update(parsed.data);
    await invalidatePromptAdsCache();
    revalidatePath(ADMIN_PATH);
    revalidatePath(`${ADMIN_PATH}/${parsed.data.id}`);
    return { success: true, ad };
  } catch (error) {
    logger.error("Failed to update prompt ad", error);
    return { success: false, message: errorToString(error) };
  }
}

export async function deletePromptAdAction(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdminUserId();
    await promptAdRepository.deleteById(id);
    await invalidatePromptAdsCache();
    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete prompt ad", error);
    return { success: false, message: errorToString(error) };
  }
}
