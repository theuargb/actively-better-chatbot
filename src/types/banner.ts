import { z } from "zod";
import { SUPPORTED_LOCALES } from "lib/const";

/**
 * Banners are admin-authored announcements - a release note, a maintenance
 * notice - shown as a modal over the app shell. Each one carries an optional
 * image plus a caption/subtitle/body per locale, so the same banner renders in
 * the visitor's language. A missing translation never hides a banner:
 * `resolveBannerVariant` falls back to English, then to whatever exists.
 *
 * A banner is shown to a given user exactly once. The dismissal is recorded
 * server-side (`banner_dismissal`), so it stays dismissed across devices - and
 * survives the localStorage wipe that `resetState` banners trigger.
 */

export const BANNER_FALLBACK_LOCALE = "en";

export const BannerLocaleSchema = z
  .string()
  .refine(
    (code) => SUPPORTED_LOCALES.some((locale) => locale.code === code),
    "Unsupported locale",
  );

export const BannerVariantSchema = z.object({
  locale: BannerLocaleSchema,
  caption: z.string().trim().min(1).max(120),
  /** Optional line under the caption - a version, a date. */
  subtitle: z.string().trim().max(200).optional(),
  /** Rendered as markdown. */
  body: z.string().trim().min(1).max(8000),
});

export type BannerVariant = z.infer<typeof BannerVariantSchema>;

const BannerVariantsSchema = z
  .array(BannerVariantSchema)
  .min(1, "At least one locale is required")
  .refine(
    (variants) =>
      new Set(variants.map((v) => v.locale)).size === variants.length,
    "Each locale can only be configured once",
  );

export const BannerCreateSchema = z
  .object({
    imageUrl: z.string().trim().max(1024).nullish(),
    startAt: z.coerce.date().nullish(),
    endAt: z.coerce.date().nullish(),
    enabled: z.boolean().default(true),
    /** Wipes the viewer's persisted client state once they dismiss the banner. */
    resetState: z.boolean().default(false),
    variants: BannerVariantsSchema,
  })
  .refine(
    (data) => !data.startAt || !data.endAt || data.endAt > data.startAt,
    "The end date must be after the start date",
  );

/**
 * Spelled out rather than `BannerCreateSchema.partial()` - the create schema is
 * a `ZodEffects` because of its `.refine`, which has no `.partial()`.
 */
export const BannerUpdateSchema = z
  .object({
    id: z.uuid(),
    imageUrl: z.string().trim().max(1024).nullish(),
    startAt: z.coerce.date().nullish(),
    endAt: z.coerce.date().nullish(),
    enabled: z.boolean().optional(),
    resetState: z.boolean().optional(),
    variants: BannerVariantsSchema.optional(),
  })
  .refine(
    (data) => !data.startAt || !data.endAt || data.endAt > data.startAt,
    "The end date must be after the start date",
  );

export type BannerCreate = z.infer<typeof BannerCreateSchema>;
export type BannerUpdate = z.infer<typeof BannerUpdateSchema>;

export type Banner = {
  id: string;
  imageUrl: string | null;
  startAt: Date | null;
  endAt: Date | null;
  enabled: boolean;
  resetState: boolean;
  variants: BannerVariant[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BannerListItem = Banner & {
  createdByName: string | null;
  /** How many users have already dismissed it. */
  dismissalCount: number;
};

export type BannerListQuery = {
  limit?: number;
  offset?: number;
};

export type BannerListResult = {
  items: BannerListItem[];
  total: number;
};

/** What actually reaches the client - one resolved variant per banner. */
export type BannerAnnouncement = {
  id: string;
  imageUrl: string | null;
  caption: string;
  subtitle?: string;
  body: string;
  resetState: boolean;
};

export type BannerRepository = {
  create(data: BannerCreate & { createdBy: string }): Promise<Banner>;
  update(data: BannerUpdate): Promise<Banner>;
  deleteById(id: string): Promise<void>;
  selectById(id: string): Promise<Banner | null>;
  selectList(query?: BannerListQuery): Promise<BannerListResult>;
  /** Every enabled banner; the date window is applied by `isBannerActive`. */
  selectEnabled(): Promise<Banner[]>;
  /** Ids of the banners this user has already dismissed. */
  selectDismissedIds(userId: string): Promise<string[]>;
  markDismissed(userId: string, bannerId: string): Promise<void>;
};

/** A banner only shows while enabled and inside its (optional) date window. */
export function isBannerActive(
  banner: Pick<Banner, "enabled" | "startAt" | "endAt">,
  now: Date = new Date(),
): boolean {
  if (!banner.enabled) return false;
  if (banner.startAt && banner.startAt.getTime() > now.getTime()) return false;
  if (banner.endAt && banner.endAt.getTime() <= now.getTime()) return false;
  return true;
}

/** A banner scheduled to start later has not been missed - it is upcoming. */
export function isBannerScheduled(
  banner: Pick<Banner, "enabled" | "startAt">,
  now: Date = new Date(),
): boolean {
  if (!banner.enabled) return false;
  return !!banner.startAt && banner.startAt.getTime() > now.getTime();
}

/** Exact locale, then English, then whatever exists. */
export function resolveBannerVariant(
  banner: Pick<Banner, "variants">,
  locale?: string,
): BannerVariant | null {
  if (banner.variants.length === 0) return null;
  return (
    banner.variants.find((variant) => variant.locale === locale) ??
    banner.variants.find(
      (variant) => variant.locale === BANNER_FALLBACK_LOCALE,
    ) ??
    banner.variants[0]
  );
}
