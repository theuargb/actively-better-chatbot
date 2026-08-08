import "server-only";

import {
  isPromptAdActive,
  resolvePromptAdVariant,
  type PromptAd,
  type PromptAdsPayload,
} from "app-types/prompt-ad";
import { promptAdRepository } from "lib/db/repository";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { getLocaleAction } from "@/i18n/get-locale";
import logger from "logger";

export const DEFAULT_PROMPT_ADS_COUNT = 3;

/** Enabled ads change rarely; every new chat would otherwise hit Postgres. */
const PROMPT_ADS_CACHE_TTL_MS = 60 * 1000;

/**
 * The client receives the whole active pool so it can re-pick when the visitor
 * switches models without a round trip. This caps how big that payload gets.
 */
const MAX_PROMPT_AD_POOL = 50;

/**
 * `PROMPT_ADS_COUNT` - how many examples a new chat shows. `0` disables the
 * block entirely; anything unparseable falls back to the default.
 */
export function getPromptAdsCount(): number {
  const raw = process.env.PROMPT_ADS_COUNT;
  if (raw === undefined || raw.trim() === "") return DEFAULT_PROMPT_ADS_COUNT;
  const count = Number(raw);
  return Number.isFinite(count) && count >= 0
    ? Math.floor(count)
    : DEFAULT_PROMPT_ADS_COUNT;
}

async function getEnabledPromptAds(): Promise<PromptAd[]> {
  const cached = await serverCache.get<PromptAd[]>(CacheKeys.promptAds());
  if (cached) {
    // Dates survive the memory cache but not a serializing one.
    return cached.map((ad) => ({
      ...ad,
      expiresAt: ad.expiresAt ? new Date(ad.expiresAt) : null,
    }));
  }
  const ads = await promptAdRepository.selectEnabled();
  await serverCache.set(CacheKeys.promptAds(), ads, PROMPT_ADS_CACHE_TTL_MS);
  return ads;
}

/**
 * The active ads resolved to the visitor's locale, plus how many of them to
 * show. Model scoping is applied on the client, where the selected model lives
 * and can change without a navigation. Never throws: a failure here must not
 * break a new chat.
 */
export async function getPromptAdsForLocale(
  locale?: string,
): Promise<PromptAdsPayload> {
  const count = getPromptAdsCount();
  if (count === 0) return { ads: [], count };

  try {
    const now = new Date();
    const active = (await getEnabledPromptAds()).filter((ad) =>
      isPromptAdActive(ad, now),
    );
    if (active.length === 0) return { ads: [], count };

    const resolvedLocale = locale ?? (await getLocaleAction());

    const ads = active.slice(0, MAX_PROMPT_AD_POOL).flatMap((ad) => {
      const variant = resolvePromptAdVariant(ad, resolvedLocale);
      if (!variant) return [];
      return [
        {
          id: ad.id,
          icon: ad.icon,
          mode: ad.mode,
          models: ad.models,
          caption: variant.caption,
          prompt: variant.prompt,
        },
      ];
    });

    return { ads, count };
  } catch (error) {
    logger.error("Failed to load prompt ads", error);
    return { ads: [], count };
  }
}

/** Called by the admin mutations so edits show up without waiting out the TTL. */
export async function invalidatePromptAdsCache(): Promise<void> {
  await serverCache.delete(CacheKeys.promptAds());
}
