import { z } from "zod";
import { SUPPORTED_LOCALES } from "lib/const";

/**
 * Prompt ads are admin-authored starter examples rendered under the prompt
 * input of an empty chat. Each one is an icon + caption; clicking it either
 * sends its prompt straight to the model or drops it into the input.
 *
 * A single ad carries one caption/prompt variant per locale, so the same ad
 * renders in the visitor's language. A missing translation never hides the ad -
 * `resolvePromptAdVariant` falls back to English, then to whatever variant
 * exists.
 */

export const PROMPT_AD_ICON_TYPES = ["lucide", "emoji", "url"] as const;
export type PromptAdIconType = (typeof PROMPT_AD_ICON_TYPES)[number];

/**
 * `lucide` holds a kebab-case lucide icon name ("github"), `emoji` and `url`
 * hold an image url - the same convention as `AgentIcon`.
 */
export const PromptAdIconSchema = z.object({
  type: z.enum(PROMPT_AD_ICON_TYPES),
  value: z.string().trim().min(1).max(512),
});

export type PromptAdIcon = z.infer<typeof PromptAdIconSchema>;

/** How the prompt behaves once the example is clicked. */
export const PROMPT_AD_MODES = ["prefill", "send"] as const;
export type PromptAdMode = (typeof PROMPT_AD_MODES)[number];

export const PROMPT_AD_FALLBACK_LOCALE = "en";

export const PromptAdLocaleSchema = z
  .string()
  .refine(
    (code) => SUPPORTED_LOCALES.some((locale) => locale.code === code),
    "Unsupported locale",
  );

export const PromptAdVariantSchema = z.object({
  locale: PromptAdLocaleSchema,
  caption: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(4000),
});

export type PromptAdVariant = z.infer<typeof PromptAdVariantSchema>;

const PromptAdVariantsSchema = z
  .array(PromptAdVariantSchema)
  .min(1, "At least one locale is required")
  .refine(
    (variants) =>
      new Set(variants.map((v) => v.locale)).size === variants.length,
    "Each locale can only be configured once",
  );

/**
 * Structurally a `ChatModel`, kept local so this module stays dependency-free
 * for the client bundle.
 */
export const PromptAdModelSchema = z.object({
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

export type PromptAdModel = z.infer<typeof PromptAdModelSchema>;

export const PromptAdCreateSchema = z.object({
  icon: PromptAdIconSchema,
  mode: z.enum(PROMPT_AD_MODES).default("send"),
  enabled: z.boolean().default(true),
  expiresAt: z.coerce.date().nullish(),
  /** Empty or null means every model; otherwise the ad is model-scoped. */
  models: z.array(PromptAdModelSchema).nullish(),
  variants: PromptAdVariantsSchema,
});

export const PromptAdUpdateSchema = PromptAdCreateSchema.partial().extend({
  id: z.uuid(),
});

export type PromptAdCreate = z.infer<typeof PromptAdCreateSchema>;
export type PromptAdUpdate = z.infer<typeof PromptAdUpdateSchema>;

export type PromptAd = {
  id: string;
  icon: PromptAdIcon;
  mode: PromptAdMode;
  enabled: boolean;
  expiresAt: Date | null;
  /** `null` (or empty) means the ad is shown for every model. */
  models: PromptAdModel[] | null;
  variants: PromptAdVariant[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PromptAdListItem = PromptAd & {
  createdByName: string | null;
};

export type PromptAdListQuery = {
  limit?: number;
  offset?: number;
};

export type PromptAdListResult = {
  items: PromptAdListItem[];
  total: number;
};

/** What actually reaches the chat client - one resolved variant per ad. */
export type PromptAdSuggestion = {
  id: string;
  icon: PromptAdIcon;
  mode: PromptAdMode;
  models: PromptAdModel[] | null;
  caption: string;
  prompt: string;
};

/**
 * What a new chat is handed: the whole active pool plus how many of them to
 * show. The pick happens on the client because the selected model lives there.
 */
export type PromptAdsPayload = {
  ads: PromptAdSuggestion[];
  count: number;
};

export type PromptAdRepository = {
  create(data: PromptAdCreate & { createdBy: string }): Promise<PromptAd>;
  update(data: PromptAdUpdate): Promise<PromptAd>;
  deleteById(id: string): Promise<void>;
  selectById(id: string): Promise<PromptAd | null>;
  selectList(query?: PromptAdListQuery): Promise<PromptAdListResult>;
  /** Every enabled ad; expiry is applied by `isPromptAdActive`. */
  selectEnabled(): Promise<PromptAd[]>;
};

/** An ad is only shown while enabled and unexpired. */
export function isPromptAdActive(
  ad: Pick<PromptAd, "enabled" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (!ad.enabled) return false;
  if (ad.expiresAt && ad.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * An unscoped ad runs everywhere. A scoped one needs an exact provider/model
 * match, so it stays hidden while the visitor's model is still unknown rather
 * than advertising a capability the current model may not have.
 */
export function isPromptAdForModel(
  ad: Pick<PromptAdSuggestion, "models">,
  model?: PromptAdModel | null,
): boolean {
  if (!ad.models?.length) return true;
  if (!model) return false;
  return ad.models.some(
    (scoped) =>
      scoped.provider === model.provider && scoped.model === model.model,
  );
}

/** Exact locale, then English, then whatever exists. */
export function resolvePromptAdVariant(
  ad: Pick<PromptAd, "variants">,
  locale?: string,
): PromptAdVariant | null {
  if (ad.variants.length === 0) return null;
  return (
    ad.variants.find((variant) => variant.locale === locale) ??
    ad.variants.find(
      (variant) => variant.locale === PROMPT_AD_FALLBACK_LOCALE,
    ) ??
    ad.variants[0]
  );
}
