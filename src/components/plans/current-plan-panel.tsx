"use client";

import type {
  PricingCard,
  PricingView,
  UserSubscriptionSummary,
} from "app-types/plan";
import { cn } from "lib/utils";
import { Loader, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Button } from "ui/button";

export function CurrentPlanPanel({
  user,
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
  /** `avatar` is already resolved (getUserAvatar), empty when there is none. */
  user: { name: string; avatar: string };
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
      className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card/70 p-5 shadow-sm backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        {/* The gradient ring keeps the panel's accent around a personal avatar. */}
        <div className="rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 p-0.5 shadow-md shadow-fuchsia-500/30">
          <Avatar className="size-11 rounded-full border-2 border-card bg-card">
            <AvatarImage
              className="object-cover"
              src={user.avatar || undefined}
              alt={user.name}
            />
            <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
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
            <Button
              variant="outline"
              onClick={() => onUpgrade(recommended)}
              disabled={busy}
            >
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
