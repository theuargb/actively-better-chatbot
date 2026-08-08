import "server-only";

import {
  isBannerActive,
  resolveBannerVariant,
  type Banner,
  type BannerAnnouncement,
} from "app-types/banner";
import { bannerRepository } from "lib/db/repository";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { getLocaleAction } from "@/i18n/get-locale";
import logger from "logger";

/** Enabled banners change rarely; every page load would otherwise hit Postgres. */
const BANNERS_CACHE_TTL_MS = 60 * 1000;

async function getEnabledBanners(): Promise<Banner[]> {
  const cached = await serverCache.get<Banner[]>(CacheKeys.banners());
  if (cached) {
    // Dates survive the memory cache but not a serializing one.
    return cached.map((banner) => ({
      ...banner,
      startAt: banner.startAt ? new Date(banner.startAt) : null,
      endAt: banner.endAt ? new Date(banner.endAt) : null,
    }));
  }
  const banners = await bannerRepository.selectEnabled();
  await serverCache.set(CacheKeys.banners(), banners, BANNERS_CACHE_TTL_MS);
  return banners;
}

/**
 * The oldest banner this user has not dismissed yet, resolved to their locale,
 * or `null`. One at a time: dismissing it reveals the next on the following
 * render, so a user returning after two releases reads them in order.
 *
 * Never throws - a failure here must not break the app shell.
 */
export async function getBannerForUser(
  userId: string,
  locale?: string,
): Promise<BannerAnnouncement | null> {
  try {
    const now = new Date();
    const active = (await getEnabledBanners()).filter((banner) =>
      isBannerActive(banner, now),
    );
    // The common case - skip the per-user dismissal query entirely.
    if (active.length === 0) return null;

    const dismissed = new Set(
      await bannerRepository.selectDismissedIds(userId),
    );
    const banner = active.find((candidate) => !dismissed.has(candidate.id));
    if (!banner) return null;

    const resolvedLocale = locale ?? (await getLocaleAction());
    const variant = resolveBannerVariant(banner, resolvedLocale);
    if (!variant) return null;

    return {
      id: banner.id,
      imageUrl: banner.imageUrl,
      caption: variant.caption,
      subtitle: variant.subtitle,
      body: variant.body,
      resetState: banner.resetState,
    };
  } catch (error) {
    logger.error("Failed to load banner", error);
    return null;
  }
}

/** Called by the admin mutations so edits show up without waiting out the TTL. */
export async function invalidateBannersCache(): Promise<void> {
  await serverCache.delete(CacheKeys.banners());
}
