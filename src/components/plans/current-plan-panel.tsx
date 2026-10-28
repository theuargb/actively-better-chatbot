"use client";

import type {
  PricingCard,
  PricingView,
  UserSubscriptionSummary,
} from "app-types/plan";
import { cn } from "lib/utils";
import { Gem, Loader, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "ui/button";

export function CurrentPlanPanel({
  current,
  subscription,
  billingEnabled,
  recommended,
  pending,
  onManageBilling,
  onCancel,
  onRestore,
  onUpgrade,
}: {
  current: PricingView["current"];
  subscription: UserSubscriptionSummary | null;
  billingEnabled: boolean;
  recommended: PricingCard | undefined;
  pending: string | null;
  onManageBilling: () => void;
  onCancel: () => void;
  onRestore: () => void;
  onUpgrade: (card: PricingCard) => void;
}) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const periodEnd = subscription?.periodEnd
    ? new Date(subscription.periodEnd).toLocaleDateString(locale)
    : null;
  const cancelling = Boolean(subscription?.cancelAtPeriodEnd);

  const status =
    cancelling && periodEnd
      ? t("endsOn", { date: periodEnd })
      : periodEnd
        ? t("renewsOn", { date: periodEnd })
        : current.source === "assigned"
          ? t("assignedByAdmin")
          : current.source === "free"
            ? t("freeStatus")
            : null;

  const spinner = (key: string) =>
    pending === key && <Loader className="size-4 animate-spin" />;
  const busy = pending !== null;

  return (
    <div
      data-testid="current-plan-panel"
      className="rounded-2xl border bg-card p-5 flex flex-wrap items-center gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Gem className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("yourPlan")}</p>
          <p className="text-lg font-semibold leading-tight">{current.name}</p>
          {status && (
            <p
              className={cn(
                "text-xs text-muted-foreground",
                cancelling && "text-destructive",
              )}
            >
              {status}
            </p>
          )}
        </div>
      </div>

      {billingEnabled && (
        <div className="ml-auto flex flex-wrap gap-2">
          {subscription && !cancelling && (
            <>
              <Button
                variant="outline"
                onClick={onManageBilling}
                disabled={busy}
              >
                {spinner("portal")}
                {t("manageBilling")}
              </Button>
              <Button variant="ghost" onClick={onCancel} disabled={busy}>
                {t("cancelSubscription")}
              </Button>
            </>
          )}
          {subscription && cancelling && (
            <>
              <Button onClick={onRestore} disabled={busy}>
                {spinner("restore")}
                {t("resumeSubscription")}
              </Button>
              <Button
                variant="outline"
                onClick={onManageBilling}
                disabled={busy}
              >
                {spinner("portal")}
                {t("manageBilling")}
              </Button>
            </>
          )}
          {!subscription && recommended && (
            <Button onClick={() => onUpgrade(recommended)} disabled={busy}>
              {pending === recommended.id ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {t("upgradeTo", { plan: recommended.name })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
