"use client";

import type { PricingModel } from "app-types/plan";
import { Loader } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "ui/alert-dialog";
import { ModelProviderIcon } from "ui/model-provider-icon";

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
  planName,
  periodEnd,
  targetName,
  losesModels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending: string | null;
  planName: string;
  periodEnd: Date | null;
  targetName: string;
  losesModels: PricingModel[];
}) {
  const t = useTranslations("Pricing");
  const locale = useLocale();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("cancelTitle", { plan: planName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {periodEnd
              ? t("cancelDescription", {
                  plan: planName,
                  date: new Date(periodEnd).toLocaleDateString(locale),
                  target: targetName,
                })
              : t("cancelDescriptionNoDate", {
                  plan: planName,
                  target: targetName,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {losesModels.length > 0 && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{t("cancelLoses")}</p>
            <ul className="space-y-1.5">
              {losesModels.map((model) => (
                <li
                  key={`${model.provider}/${model.name}`}
                  className="flex items-center gap-2"
                >
                  <ModelProviderIcon
                    provider={model.provider}
                    className="size-4 shrink-0"
                  />
                  <span>{model.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {t("keepPlan")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending !== null}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {pending === "cancel" && <Loader className="size-4 animate-spin" />}
            {t("confirmCancel")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
