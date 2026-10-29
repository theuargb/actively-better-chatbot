"use client";

import type {
  PricingCard,
  PricingView,
  UserSubscriptionSummary,
} from "app-types/plan";
import { authClient } from "auth/client";
import { cn } from "lib/utils";
import { Lock, Sparkles } from "lucide-react";
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
  checkoutSuccess: boolean;
  user: { name: string; avatar: string };
};

const PLAN_SUMMARY_KEY = "/api/user/plan";

/** Banner art by card position: cheapest first, the last image repeats. */
const PLAN_ART = [
  "/pricing/tier-0.webp",
  "/pricing/tier-1.webp",
  "/pricing/tier-2.webp",
  "/pricing/tier-3.webp",
];

export function PricingPlans({
  view,
  subscription,
  billingEnabled,
  checkoutSuccess,
  user,
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
        ? "md:grid-cols-3 max-w-6xl mx-auto"
        : "md:grid-cols-2 max-w-3xl mx-auto";

  return (
    <div className="relative isolate w-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px]"
      >
        <div className="absolute -top-32 left-[10%] size-[420px] rounded-full bg-violet-500/30 blur-3xl motion-safe:animate-[pricing-aurora_18s_ease-in-out_infinite]" />
        <div className="absolute -top-20 right-[8%] size-[380px] rounded-full bg-fuchsia-500/25 blur-3xl motion-safe:animate-[pricing-aurora_22s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-24 left-1/2 size-[340px] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl motion-safe:animate-[pricing-aurora_26s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-10 px-6 py-12">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/30 bg-background/60 px-3 py-1 text-xs font-medium text-fuchsia-600 backdrop-blur dark:text-fuchsia-300">
            <Sparkles className="size-3.5" />
            {t("eyebrow")}
          </span>
          <h1 className="bg-[linear-gradient(110deg,#7c3aed,#db2777,#f59e0b)] bg-clip-text pb-1 text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            {t("headline")}
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">
            {t("subheadline")}
          </p>
        </div>

        <CurrentPlanPanel
          user={user}
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
            <div className="inline-flex items-center rounded-full border bg-background/70 p-1 text-sm shadow-sm backdrop-blur">
              {[false, true].map((isAnnual) => (
                <button
                  key={String(isAnnual)}
                  type="button"
                  onClick={() => setAnnual(isAnnual)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-1.5 transition-colors",
                    annual === isAnnual
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(isAnnual ? "annual" : "monthly")}
                  {isAnnual && view.annualSavingsPercent !== null && (
                    <Badge className="border-0 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white">
                      {t("saveUpTo", { percent: view.annualSavingsPercent })}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={cn("grid items-stretch gap-6 pt-3", gridColumns)}>
          {view.cards.map((card, index) => (
            <PlanCard
              key={card.id}
              card={card}
              art={PLAN_ART[Math.min(index, PLAN_ART.length - 1)]}
              annual={annual}
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
    </div>
  );
}
