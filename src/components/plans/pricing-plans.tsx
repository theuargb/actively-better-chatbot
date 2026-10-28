"use client";

import type {
  PricingCard,
  PricingView,
  UserSubscriptionSummary,
} from "app-types/plan";
import { authClient } from "auth/client";
import { cn } from "lib/utils";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { Badge } from "ui/badge";
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog";
import { CurrentPlanPanel } from "./current-plan-panel";
import { PlanCard } from "./plan-card";

type Props = {
  view: PricingView;
  subscription: UserSubscriptionSummary | null;
  billingEnabled: boolean;
  currency: string;
  checkoutSuccess: boolean;
};

const PLAN_SUMMARY_KEY = "/api/user/plan";

export function PricingPlans({
  view,
  subscription,
  billingEnabled,
  currency,
  checkoutSuccess,
}: Props) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  // A card id, or "portal" | "cancel" | "restore".
  const [pending, setPending] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const showAnnualToggle = view.cards.some((card) => card.hasAnnual);
  const recommended = view.cards.find((card) => card.recommended);
  const subscriptionId = subscription?.stripeSubscriptionId ?? undefined;

  useEffect(() => {
    if (!checkoutSuccess) return;
    toast.success(t("checkoutSuccess"));
    mutate(PLAN_SUMMARY_KEY);
  }, [checkoutSuccess, t]);

  const fail = () => {
    setPending(null);
    toast.error(t("actionFailed"));
  };

  const upgrade = async (card: PricingCard) => {
    setPending(card.id);
    const { error } = await authClient.subscription.upgrade({
      plan: card.code!,
      annual: annual && card.hasAnnual,
      // Passing the current subscription switches plans instead of stacking a second one.
      subscriptionId,
      successUrl: "/pricing?checkout=success",
      cancelUrl: "/pricing",
      // Switching goes through the portal's update-confirm flow, which returns here.
      returnUrl: "/pricing",
    });
    if (error) fail();
  };

  const manageBilling = async () => {
    setPending("portal");
    const { error } = await authClient.subscription.billingPortal({
      returnUrl: "/pricing",
    });
    if (error) fail();
  };

  const cancel = async () => {
    setPending("cancel");
    const { error } = await authClient.subscription.cancel({
      subscriptionId,
      returnUrl: "/pricing",
    });
    if (error) fail();
  };

  const restore = async () => {
    setPending("restore");
    const { error } = await authClient.subscription.restore({
      subscriptionId,
    });
    if (error) return fail();
    setPending(null);
    toast.success(t("resumed"));
    router.refresh();
    mutate(PLAN_SUMMARY_KEY);
  };

  const gridColumns =
    view.cards.length >= 4
      ? "md:grid-cols-2 xl:grid-cols-4"
      : view.cards.length === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-2 max-w-3xl mx-auto";

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-10 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t("headline")}
        </h1>
        <p className="text-muted-foreground">{t("subheadline")}</p>
      </div>

      <CurrentPlanPanel
        current={view.current}
        subscription={subscription}
        billingEnabled={billingEnabled}
        recommended={recommended}
        pending={pending}
        onManageBilling={manageBilling}
        onCancel={() => setCancelOpen(true)}
        onRestore={restore}
        onUpgrade={upgrade}
      />

      {showAnnualToggle && (
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-lg border p-1 text-sm">
            {[false, true].map((isAnnual) => (
              <button
                key={String(isAnnual)}
                type="button"
                onClick={() => setAnnual(isAnnual)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1 transition-colors",
                  annual === isAnnual
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(isAnnual ? "annual" : "monthly")}
                {isAnnual && view.annualSavingsPercent !== null && (
                  <Badge variant="secondary">
                    {t("saveUpTo", { percent: view.annualSavingsPercent })}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn("grid gap-6 items-stretch", gridColumns)}>
        {view.cards.map((card) => (
          <PlanCard
            key={card.id}
            card={card}
            annual={annual}
            currency={currency}
            locale={locale}
            pending={pending}
            onUpgrade={upgrade}
            onCancel={() => setCancelOpen(true)}
          />
        ))}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        {billingEnabled ? (
          <>
            <Lock className="size-3" />
            {t("securePayments")}
          </>
        ) : (
          t("billingDisabled")
        )}
      </p>

      <CancelSubscriptionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={cancel}
        pending={pending}
        planName={view.current.name}
        periodEnd={subscription?.periodEnd ?? null}
        targetName={view.cancelTargetName}
        losesModels={view.cancelLosesModels}
      />
    </div>
  );
}
