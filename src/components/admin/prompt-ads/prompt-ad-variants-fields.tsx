"use client";

import { useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { SUPPORTED_LOCALES } from "lib/const";
import {
  PROMPT_AD_FALLBACK_LOCALE,
  type PromptAdVariant,
} from "app-types/prompt-ad";

export function PromptAdVariantsFields({
  variants,
  onChange,
}: {
  variants: PromptAdVariant[];
  onChange: (variants: PromptAdVariant[]) => void;
}) {
  const t = useTranslations("Admin.PromptAds");

  const unusedLocales = useMemo(
    () =>
      SUPPORTED_LOCALES.filter(
        (locale) => !variants.some((variant) => variant.locale === locale.code),
      ),
    [variants],
  );

  const patch = useCallback(
    (index: number, values: Partial<PromptAdVariant>) => {
      onChange(
        variants.map((variant, i) =>
          i === index ? { ...variant, ...values } : variant,
        ),
      );
    },
    [variants, onChange],
  );

  const add = useCallback(() => {
    const next = unusedLocales[0];
    if (!next) return;
    onChange([...variants, { locale: next.code, caption: "", prompt: "" }]);
  }, [unusedLocales, variants, onChange]);

  const remove = useCallback(
    (index: number) => onChange(variants.filter((_, i) => i !== index)),
    [variants, onChange],
  );

  return (
    <div className="space-y-4">
      {variants.map((variant, index) => {
        const isFallback = variant.locale === PROMPT_AD_FALLBACK_LOCALE;
        return (
          <div
            key={variant.locale}
            className="rounded-lg border p-4 space-y-3"
            data-testid={`prompt-ad-variant-${variant.locale}`}
          >
            <div className="flex items-center gap-2">
              <Select
                value={variant.locale}
                onValueChange={(locale) => patch(index, { locale })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...SUPPORTED_LOCALES.filter(
                      (locale) => locale.code === variant.locale,
                    ),
                    ...unusedLocales,
                  ].map((locale) => (
                    <SelectItem key={locale.code} value={locale.code}>
                      {locale.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFallback && (
                <span className="text-xs text-muted-foreground">
                  {t("fallbackLocaleHint")}
                </span>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={t("removeLocale")}
                disabled={variants.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`prompt-ad-caption-${variant.locale}`}>
                {t("fieldCaption")}
              </Label>
              <Input
                id={`prompt-ad-caption-${variant.locale}`}
                value={variant.caption}
                placeholder={t("fieldCaptionPlaceholder")}
                onChange={(event) =>
                  patch(index, { caption: event.target.value })
                }
                data-testid={`prompt-ad-caption-${variant.locale}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`prompt-ad-prompt-${variant.locale}`}>
                {t("fieldPrompt")}
              </Label>
              <Textarea
                id={`prompt-ad-prompt-${variant.locale}`}
                value={variant.prompt}
                rows={3}
                placeholder={t("fieldPromptPlaceholder")}
                onChange={(event) =>
                  patch(index, { prompt: event.target.value })
                }
                data-testid={`prompt-ad-prompt-${variant.locale}`}
              />
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={unusedLocales.length === 0}
        data-testid="prompt-ad-add-locale"
      >
        <Plus className="size-4 mr-1" />
        {t("addLocale")}
      </Button>
    </div>
  );
}
