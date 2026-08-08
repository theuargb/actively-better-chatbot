"use server";

import { getSession } from "auth/server";
import { bannerRepository } from "lib/db/repository";
import logger from "logger";

/**
 * Records that the signed-in user has seen a banner, so it never shows again.
 * Any logged-in user may call this for themselves - the id is only ever used as
 * a foreign key, so a bogus one fails the constraint harmlessly.
 */
export async function dismissBannerAction(
  bannerId: string,
): Promise<{ success: boolean }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return { success: false };

    await bannerRepository.markDismissed(session.user.id, bannerId);
    return { success: true };
  } catch (error) {
    logger.error("Failed to dismiss banner", error);
    return { success: false };
  }
}
