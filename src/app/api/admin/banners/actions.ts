"use server";

import { requireAdminPermission } from "lib/auth/permissions";
import { getSession } from "auth/server";
import { bannerRepository } from "lib/db/repository";
import {
  Banner,
  BannerCreateSchema,
  BannerListQuery,
  BannerListResult,
  BannerUpdateSchema,
} from "app-types/banner";
import { invalidateBannersCache } from "lib/banner/server";
import { revalidatePath } from "next/cache";
import logger from "logger";
import { errorToString } from "lib/utils";

export type BannerActionResult =
  | { success: true; banner: Banner }
  | { success: false; message: string };

const ADMIN_PATH = "/admin/banners";

async function requireAdminUserId(): Promise<string> {
  await requireAdminPermission("manage banners");
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function listBannersAction(
  query?: BannerListQuery,
): Promise<BannerListResult> {
  await requireAdminPermission("list banners");
  return bannerRepository.selectList(query);
}

export async function getBannerAction(id: string): Promise<Banner | null> {
  await requireAdminPermission("view banners");
  return bannerRepository.selectById(id);
}

export async function createBannerAction(
  input: unknown,
): Promise<BannerActionResult> {
  try {
    const userId = await requireAdminUserId();
    const parsed = BannerCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const banner = await bannerRepository.create({
      ...parsed.data,
      createdBy: userId,
    });
    await invalidateBannersCache();
    revalidatePath(ADMIN_PATH);
    return { success: true, banner };
  } catch (error) {
    logger.error("Failed to create banner", error);
    return { success: false, message: errorToString(error) };
  }
}

export async function updateBannerAction(
  input: unknown,
): Promise<BannerActionResult> {
  try {
    await requireAdminUserId();
    const parsed = BannerUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0].message };
    }

    const existing = await bannerRepository.selectById(parsed.data.id);
    if (!existing) {
      return { success: false, message: "Banner not found" };
    }

    const banner = await bannerRepository.update(parsed.data);
    await invalidateBannersCache();
    revalidatePath(ADMIN_PATH);
    revalidatePath(`${ADMIN_PATH}/${parsed.data.id}`);
    return { success: true, banner };
  } catch (error) {
    logger.error("Failed to update banner", error);
    return { success: false, message: errorToString(error) };
  }
}

export async function deleteBannerAction(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdminUserId();
    await bannerRepository.deleteById(id);
    await invalidateBannersCache();
    revalidatePath(ADMIN_PATH);
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete banner", error);
    return { success: false, message: errorToString(error) };
  }
}
