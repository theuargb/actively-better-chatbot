"use client";

import type { PricingPlan, UserSubscriptionSummary } from "app-types/plan";
import { authClient } from "auth/client";
import { formatPlanPrice } from "lib/plan/currency";
import { cn } from "lib/utils";
import { Check, Loader } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "ui/badge";
import { Button } from "ui/button";

type Props = {
  plans: PricingPlan[];
  effectivePlan: {
    code: string;
    name: string;
    source: "subscription" | "assigned";
  } | null;
  subscription: UserSubscriptionSummary | null;
  billingEnabled: boolean;
  currency: string;
  checkoutSuccess: boolean;
};

export function PricingPlans({
  plans,
  effectivePlan,
  subscription,
  billingEnabled,
  currency,
  checkoutSuccess,
}: Props) {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const [annual, setAnnual] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const showAnnualToggle = plans.some((plan) => plan.hasAnnual);

  useEffect(() => {
    if (checkoutSuccess) toast.success(t("checkoutSuccess"));
  }, [checkoutSuccess, t]);

  const fail = () => {
    setPending(null);
    toast.error(t("checkoutFailed"));
  };

  const subscribe = async (plan: PricingPlan) => {
    setPending(plan.id);
    const { error } = await authClient.subscription.upgrade({
      plan: plan.code,
      annual: annual && plan.hasAnnual,
      // Passing the current subscription switches plans instead of stacking a second one.
      subscriptionId: subscription?.stripeSubscriptionId ?? undefined,
      successUrl: "/pricing?checkout=success",
      cancelUrl: "/pricing",
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

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        {effectivePlan?.source === "assigned" && (
          <p className="text-xs text-muted-foreground">
            {t("assignedByAdmin")}: {effectivePlan.name}
          </p>
        )}
        {subscription && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {subscription.periodEnd && (
              <span className="text-xs text-muted-foreground">
                {t(subscription.cancelAtPeriodEnd ? "cancelsOn" : "renewsOn", {
                  date: new Date(subscription.periodEnd).toLocaleDateString(
                    locale,
                  ),
                })}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={manageBilling}
              disabled={pending !== null}
            >
              {pending === "portal" && (
                <Loader className="size-4 animate-spin" />
              )}
              {t("manageBilling")}
            </Button>
          </div>
        )}
        {!billingEnabled && (
          <p className="text-xs text-muted-foreground">
            {t("billingDisabled")}
          </p>
        )}
      </div>

      {showAnnualToggle && (
        <div className="inline-flex rounded-lg border p-1 text-sm">
          {[false, true].map((isAnnual) => (
            <button
              key={String(isAnnual)}
              type="button"
              onClick={() => setAnnual(isAnnual)}
              className={cn(
                "rounded-md px-3 py-1 transition-colors",
                annual === isAnnual
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(isAnnual ? "annual" : "monthly")}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = effectivePlan?.code === plan.code;
          const useAnnual = annual && plan.hasAnnual && plan.annualPrice;
          const price = useAnnual ? plan.annualPrice! : plan.price;
          return (
            <div
              key={plan.id}
              data-testid={`pricing-plan-${plan.code}`}
              className={cn(
                "flex flex-col gap-4 rounded-xl border p-5",
                isCurrent && "border-primary",
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  {isCurrent && <Badge>{t("currentPlan")}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.shortDescription}
                </p>
              </div>
              <p className="text-3xl font-semibold tracking-tight">
                {formatPlanPrice(price, currency, locale)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {useAnnual ? t("perYear") : t("perMonth")}
                </span>
              </p>
              <ul className="flex-1 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? null : plan.purchasable && billingEnabled ? (
                <Button
                  onClick={() => subscribe(plan)}
                  disabled={pending !== null}
                >
                  {pending === plan.id && (
                    <Loader className="size-4 animate-spin" />
                  )}
                  {subscription ? t("switchPlan") : t("subscribe")}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("notPurchasable")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
