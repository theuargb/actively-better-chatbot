"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Clock,
  Loader,
  Lock,
  MessageSquarePlus,
  Sparkles,
  SquarePen,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "ui/button";
import { Separator } from "ui/separator";
import { GlowButton } from "@/components/plans/glow-button";
import type {
  RateLimitMessagePayload,
  ThreadLimitMessagePayload,
} from "lib/ai/rate-limit-message";
import type { ModelLockedPayload } from "lib/plan/model-locked-message";
import { startPlanCheckout } from "lib/plan/start-checkout";
import type { LimitOffer, PlanOffer } from "lib/plan/upgrade-offer";

/**
 * Shared shell so the rate-limit, thread-limit and model-lock notices read as
 * one family: an outlined card, a tinted icon chip, an optional upgrade offer,
 * and a muted meta row beneath.
 */
function LimitNotice({
  icon,
  title,
  description,
  offer,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  offer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="w-full mx-auto max-w-3xl px-6 mt-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Deliberately not <Alert>: its grid layout reserves a narrow first column
          for an icon, which collapses a header/footer structure like this one. */}
      <div
        role="alert"
        className="overflow-hidden rounded-lg border bg-card/60 text-card-foreground backdrop-blur-sm"
      >
        <div className="flex items-start gap-3.5 p-4">
          <div className="shrink-0 grid place-items-center size-9 rounded-lg border bg-muted/50 text-muted-foreground">
            {icon}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium tracking-tight">{title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {offer}
        {children ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-muted/30 px-4 py-2.5">
              {children}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Starts checkout for `plan`, or opens /pricing when it cannot be bought online. */
export function usePlanOfferAction() {
  const t = useTranslations("Chat");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  const run = async (plan: PlanOffer) => {
    if (!plan.purchasable) {
      router.push("/pricing");
      return;
    }
    setPending(true);
    if (!(await startPlanCheckout(plan.code, pathname))) {
      setPending(false);
      toast.error(t("checkoutFailed"));
    }
  };

  return { run, pending };
}

/**
 * The selling part of a notice: what the next plan gives and the one button
 * that gets it. It is the notice's only primary action.
 */
function UpgradeOffer({
  plan,
  benefit,
}: {
  plan: PlanOffer;
  benefit: string;
}) {
  const t = useTranslations("Chat");
  const { run, pending } = usePlanOfferAction();
  return (
    <div className="mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-fuchsia-500/25 bg-gradient-to-r from-violet-500/[0.07] via-fuchsia-500/[0.07] to-amber-500/[0.07] px-3.5 py-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#db2777,#f59e0b)] text-white shadow-md shadow-fuchsia-500/30">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-sm font-semibold">{plan.name}</p>
        <p className="text-xs text-muted-foreground">{benefit}</p>
      </div>
      {plan.purchasable ? (
        <GlowButton
          size="sm"
          className="h-8"
          disabled={pending}
          onClick={() => run(plan)}
        >
          {pending ? (
            <Loader className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {t("upgradeTo", { plan: plan.name })}
        </GlowButton>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => run(plan)}
        >
          {t("seePlans")}
        </Button>
      )}
    </div>
  );
}

type OfferKind = RateLimitMessagePayload["window"] | "thread";

/** One line saying what the offered plan changes about the limit just hit. */
export function useOfferBenefit() {
  const t = useTranslations("Chat");
  return (kind: OfferKind, offer: LimitOffer) => {
    if (offer.limit === null) {
      return t(
        kind === "hour"
          ? "offerNoHourlyLimit"
          : kind === "day"
            ? "offerNoDailyLimit"
            : "offerNoChatLimit",
      );
    }
    return t(
      kind === "hour"
        ? "offerPerHour"
        : kind === "day"
          ? "offerPerDay"
          : "offerPerChat",
      { limit: offer.limit },
    );
  };
}

export function RateLimitNotice({
  payload,
}: {
  payload: RateLimitMessagePayload;
}) {
  const t = useTranslations("Chat");
  const benefit = useOfferBenefit();
  const retryMinutes = Math.max(1, Math.ceil(payload.retryAfterSeconds / 60));
  const { offer } = payload;

  return (
    <LimitNotice
      icon={<TriangleAlert className="size-4" />}
      title={t(
        payload.window === "hour"
          ? "rateLimitedHourlyTitle"
          : "rateLimitedDailyTitle",
        { limit: payload.limit },
      )}
      description={
        offer
          ? t("rateLimitedUpsell", { plan: offer.plan.name })
          : t("rateLimitedSupport")
      }
      offer={
        offer && (
          <UpgradeOffer
            plan={offer.plan}
            benefit={benefit(payload.window, offer)}
          />
        )
      }
    >
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {t("rateLimitedRetryAfter", { minutes: retryMinutes })}
      </span>
    </LimitNotice>
  );
}

export function ThreadLimitNotice({
  payload,
}: {
  payload: ThreadLimitMessagePayload;
}) {
  const t = useTranslations("Chat");
  const router = useRouter();
  const benefit = useOfferBenefit();
  const { limit, offer } = payload;

  return (
    <LimitNotice
      icon={<MessageSquarePlus className="size-4" />}
      title={t("threadLimitReachedTitle", { limit })}
      description={
        offer
          ? t("threadLimitUpsell", { plan: offer.plan.name })
          : t("threadLimitReachedDescription")
      }
      offer={
        offer && (
          <UpgradeOffer plan={offer.plan} benefit={benefit("thread", offer)} />
        )
      }
    >
      <Button
        size="sm"
        // With an offer on screen the upgrade is the primary action.
        variant={offer ? "outline" : "default"}
        className="h-8"
        onClick={() => {
          // refresh() is required alongside push(): without it Next serves the
          // cached RSC payload and the thread stays on screen.
          router.push("/");
          router.refresh();
        }}
      >
        <SquarePen className="size-3.5" />
        {t("threadLimitNewChat")}
      </Button>
      <span className="text-xs text-muted-foreground">
        {t("threadLimitKeepsContextSharp")}
      </span>
    </LimitNotice>
  );
}

export function ModelLockedNotice({
  payload,
}: {
  payload: ModelLockedPayload;
}) {
  const t = useTranslations("Chat");
  const { requiredPlan } = payload;

  return (
    <LimitNotice
      icon={<Lock className="size-4" />}
      title={t("modelLockedTitle")}
      description={
        requiredPlan
          ? t("modelLockedDescription", {
              model: payload.model,
              plan: requiredPlan.name,
            })
          : t("modelLockedUnavailable", { model: payload.model })
      }
      offer={
        requiredPlan && (
          <UpgradeOffer
            plan={requiredPlan}
            benefit={t("offerUnlocksModel", { model: payload.model })}
          />
        )
      }
    />
  );
}
