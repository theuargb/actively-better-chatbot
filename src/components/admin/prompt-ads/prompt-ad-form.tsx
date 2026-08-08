"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader } from "lucide-react";

import { Button, buttonVariants } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Switch } from "ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { cn } from "lib/utils";
import { useObjectState } from "@/hooks/use-object-state";
import {
  PROMPT_AD_FALLBACK_LOCALE,
  PROMPT_AD_MODES,
  type PromptAd,
  type PromptAdIcon as PromptAdIconValue,
  type PromptAdMode,
  type PromptAdModel,
  type PromptAdVariant,
} from "app-types/prompt-ad";
import {
  createPromptAdAction,
  updatePromptAdAction,
} from "@/app/api/admin/prompt-ads/actions";
import { PromptAdIconPicker } from "./prompt-ad-icon-picker";
import { PromptAdModelFields } from "./prompt-ad-model-fields";
import { PromptAdVariantsFields } from "./prompt-ad-variants-fields";

const LIST_URL = "/admin/prompt-ads";

const DEFAULT_ICON: PromptAdIconValue = { type: "lucide", value: "sparkles" };

/** `datetime-local` needs a local `YYYY-MM-DDTHH:mm` string, not an ISO one. */
const toLocalInputValue = (date: Date | null) => {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function PromptAdForm({ ad }: { ad?: PromptAd }) {
  const t = useTranslations("Admin.PromptAds");
  const router = useRouter();
  const isEdit = !!ad;

  const [form, setForm] = useObjectState({
    mode: (ad?.mode ?? "send") as PromptAdMode,
    enabled: ad?.enabled ?? true,
    expiresAt: toLocalInputValue(ad?.expiresAt ?? null),
  });

  const [icon, setIcon] = useState<PromptAdIconValue>(ad?.icon ?? DEFAULT_ICON);
  const [models, setModels] = useState<PromptAdModel[] | null>(
    ad?.models ?? null,
  );
  const [variants, setVariants] = useState<PromptAdVariant[]>(
    ad?.variants?.length
      ? ad.variants
      : [{ locale: PROMPT_AD_FALLBACK_LOCALE, caption: "", prompt: "" }],
  );

  const [isSaving, startSaving] = useTransition();

  const submit = useCallback(() => {
    if (!icon.value.trim()) {
      toast.error(t("iconRequired"));
      return;
    }
    const incomplete = variants.find(
      (variant) => !variant.caption.trim() || !variant.prompt.trim(),
    );
    if (incomplete) {
      toast.error(t("variantIncomplete", { locale: incomplete.locale }));
      return;
    }
    // An empty scope would hide the ad everywhere, which is never the intent.
    if (models?.length === 0) {
      toast.error(t("modelsRequired"));
      return;
    }

    const payload = {
      icon,
      mode: form.mode,
      enabled: form.enabled,
      expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
      models,
      variants: variants.map((variant) => ({
        locale: variant.locale,
        caption: variant.caption.trim(),
        prompt: variant.prompt.trim(),
      })),
    };

    startSaving(async () => {
      const result = isEdit
        ? await updatePromptAdAction({ ...payload, id: ad.id })
        : await createPromptAdAction(payload);

      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(isEdit ? t("adSaved") : t("adCreated"));
      router.push(LIST_URL);
      router.refresh();
    });
  }, [icon, models, variants, form, isEdit, ad, router, t]);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={LIST_URL}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="size-4 mr-1" />
          {t("backToAds")}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">
          {isEdit ? t("editAd") : t("createAd")}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label>{t("fieldIcon")}</Label>
            <PromptAdIconPicker icon={icon} onChange={setIcon} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-ad-mode">{t("fieldMode")}</Label>
            <Select
              value={form.mode}
              onValueChange={(mode) => setForm({ mode: mode as PromptAdMode })}
            >
              <SelectTrigger id="prompt-ad-mode" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMPT_AD_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode === "send" ? t("modeSend") : t("modePrefill")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("fieldModeDescription")}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="prompt-ad-enabled">{t("fieldEnabled")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("fieldEnabledDescription")}
              </p>
            </div>
            <Switch
              id="prompt-ad-enabled"
              checked={form.enabled}
              onCheckedChange={(enabled) => setForm({ enabled })}
              data-testid="prompt-ad-enabled"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt-ad-expires">{t("fieldExpiresAt")}</Label>
            <Input
              id="prompt-ad-expires"
              type="datetime-local"
              value={form.expiresAt}
              className="w-fit"
              onChange={(event) => setForm({ expiresAt: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t("fieldExpiresAtDescription")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("sectionModels")}</CardTitle>
          <CardDescription>{t("sectionModelsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PromptAdModelFields models={models} onChange={setModels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("sectionContent")}</CardTitle>
          <CardDescription>{t("sectionContentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PromptAdVariantsFields variants={variants} onChange={setVariants} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 pb-10">
        <Link
          href={LIST_URL}
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          {t("cancel")}
        </Link>
        <Button
          onClick={submit}
          disabled={isSaving}
          data-testid="prompt-ad-save"
        >
          {isSaving && <Loader className="size-3.5 mr-1 animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
