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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { cn } from "lib/utils";
import { useObjectState } from "@/hooks/use-object-state";
import {
  BANNER_FALLBACK_LOCALE,
  type Banner,
  type BannerVariant,
} from "app-types/banner";
import {
  createBannerAction,
  updateBannerAction,
} from "@/app/api/admin/banners/actions";
import { BannerImageField } from "./banner-image-field";
import { BannerVariantsFields } from "./banner-variants-fields";

const LIST_URL = "/admin/banners";

/** `datetime-local` needs a local `YYYY-MM-DDTHH:mm` string, not an ISO one. */
const toLocalInputValue = (date: Date | null) => {
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function BannerForm({ banner }: { banner?: Banner }) {
  const t = useTranslations("Admin.Banners");
  const router = useRouter();
  const isEdit = !!banner;

  const [form, setForm] = useObjectState({
    enabled: banner?.enabled ?? true,
    resetState: banner?.resetState ?? false,
    startAt: toLocalInputValue(banner?.startAt ?? null),
    endAt: toLocalInputValue(banner?.endAt ?? null),
  });

  const [imageUrl, setImageUrl] = useState<string | null>(
    banner?.imageUrl ?? null,
  );
  const [variants, setVariants] = useState<BannerVariant[]>(
    banner?.variants?.length
      ? banner.variants
      : [
          {
            locale: BANNER_FALLBACK_LOCALE,
            caption: "",
            subtitle: "",
            body: "",
          },
        ],
  );

  const [isSaving, startSaving] = useTransition();

  const submit = useCallback(() => {
    const incomplete = variants.find(
      (variant) => !variant.caption.trim() || !variant.body.trim(),
    );
    if (incomplete) {
      toast.error(t("variantIncomplete", { locale: incomplete.locale }));
      return;
    }

    const startAt = form.startAt ? new Date(form.startAt) : null;
    const endAt = form.endAt ? new Date(form.endAt) : null;
    if (startAt && endAt && endAt <= startAt) {
      toast.error(t("invalidDateRange"));
      return;
    }

    const payload = {
      imageUrl,
      startAt,
      endAt,
      enabled: form.enabled,
      resetState: form.resetState,
      variants: variants.map((variant) => ({
        locale: variant.locale,
        caption: variant.caption.trim(),
        // An empty subtitle is "no subtitle", not an empty line.
        subtitle: variant.subtitle?.trim() || undefined,
        body: variant.body.trim(),
      })),
    };

    startSaving(async () => {
      const result = isEdit
        ? await updateBannerAction({ ...payload, id: banner.id })
        : await createBannerAction(payload);

      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(isEdit ? t("bannerSaved") : t("bannerCreated"));
      router.push(LIST_URL);
      router.refresh();
    });
  }, [imageUrl, variants, form, isEdit, banner, router, t]);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={LIST_URL}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ArrowLeft className="size-4 mr-1" />
          {t("backToBanners")}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">
          {isEdit ? t("editBanner") : t("createBanner")}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label>{t("fieldImage")}</Label>
            <BannerImageField imageUrl={imageUrl} onChange={setImageUrl} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-start-at">{t("fieldStartAt")}</Label>
              <Input
                id="banner-start-at"
                type="datetime-local"
                value={form.startAt}
                className="w-fit"
                onChange={(event) => setForm({ startAt: event.target.value })}
                data-testid="banner-start-at"
              />
              <p className="text-xs text-muted-foreground">
                {t("fieldStartAtDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-end-at">{t("fieldEndAt")}</Label>
              <Input
                id="banner-end-at"
                type="datetime-local"
                value={form.endAt}
                className="w-fit"
                onChange={(event) => setForm({ endAt: event.target.value })}
                data-testid="banner-end-at"
              />
              <p className="text-xs text-muted-foreground">
                {t("fieldEndAtDescription")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="banner-enabled">{t("fieldEnabled")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("fieldEnabledDescription")}
              </p>
            </div>
            <Switch
              id="banner-enabled"
              checked={form.enabled}
              onCheckedChange={(enabled) => setForm({ enabled })}
              data-testid="banner-enabled"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="banner-reset-state">{t("fieldResetState")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("fieldResetStateDescription")}
              </p>
              {form.resetState && (
                <p className="mt-1 text-xs text-destructive">
                  {t("fieldResetStateWarning")}
                </p>
              )}
            </div>
            <Switch
              id="banner-reset-state"
              checked={form.resetState}
              onCheckedChange={(resetState) => setForm({ resetState })}
              data-testid="banner-reset-state"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("sectionContent")}</CardTitle>
          <CardDescription>{t("sectionContentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <BannerVariantsFields variants={variants} onChange={setVariants} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 pb-10">
        <Link
          href={LIST_URL}
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          {t("cancel")}
        </Link>
        <Button onClick={submit} disabled={isSaving} data-testid="banner-save">
          {isSaving && <Loader className="size-3.5 mr-1 animate-spin" />}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
