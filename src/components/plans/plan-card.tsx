"use client";

import type { PricingCard } from "app-types/plan";
import { formatPlanPrice } from "lib/plan/currency";
import { cn } from "lib/utils";
import { Check, Loader, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { ModelProviderIcon } from "ui/model-provider-icon";
import { GlowButton } from "./glow-button";

const VISIBLE_MODELS = 6;

export function PlanCard({
  card,
  art,
  annual,
  locale,
  pending,
  onUpgrade,
  onCancel,
}: {
  card: PricingCard;
  /** Banner image under /public. */
  art: string;
  annual: boolean;
  locale: string;
  pending: string | null;
  onUpgrade: (card: PricingCard) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Pricing");
  const [showAllModels, setShowAllModels] = useState(false);
  const showAnnual = annual && card.hasAnnual;
  const monthly = showAnnual
    ? Number(card.annualPrice) / 12
    : Number(card.price);
  const isCurrent = card.action === "current";
  const models = showAllModels
    ? card.unlockedModels
    : card.unlockedModels.slice(0, VISIBLE_MODELS);
  const hiddenModels = card.unlockedModels.length - models.length;

  const cta = {
    current: {
      variant: "secondary",
      label: t("currentPlan"),
      onClick: undefined,
    },
    upgrade: {
      variant: "default",
      label: t("upgradeTo", { plan: card.name }),
      onClick: () => onUpgrade(card),
    },
    switch: {
      variant: "outline",
      label: t("switchTo", { plan: card.name }),
      onClick: () => onUpgrade(card),
    },
    cancel: {
      variant: "outline",
      label: t("downgradeTo", { plan: card.name }),
      onClick: onCancel,
    },
    contact: {
      variant: "outline",
      label: t("availableOnRequest"),
      onClick: undefined,
    },
    none: {
      variant: "ghost",
      label: t("includedInYourPlan"),
      onClick: undefined,
    },
  } as const;
  const action = cta[card.action];
  const actionContent = (
    <>
      {pending === card.id && <Loader className="size-4 animate-spin" />}
      {action.label}
    </>
  );

  return (
    <div
      data-testid={`pricing-plan-${card.code ?? "free"}`}
      className={cn(
        "group relative rounded-3xl transition-transform duration-300",
        card.recommended
          ? "overflow-hidden p-[2px] shadow-[0_24px_70px_-20px_rgba(192,38,211,0.6)] xl:-translate-y-3"
          : "hover:-translate-y-1",
      )}
    >
      {card.recommended && (
        <span
          aria-hidden
          className="absolute inset-[-75%] bg-[conic-gradient(from_0deg,#8b5cf6,#ec4899,#f59e0b,#22d3ee,#8b5cf6)] motion-safe:animate-[spin_8s_linear_infinite]"
        />
      )}
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[calc(1.5rem-2px)] bg-card",
          !card.recommended && "border shadow-sm group-hover:shadow-xl",
          isCurrent && !card.recommended && "ring-2 ring-primary/50",
        )}
      >
        <div className="relative h-36 overflow-hidden">
          <Image
            src={art}
            alt=""
            fill
            // The optimizer fetches without the session cookie and the auth
            // proxy turns that into a redirect; the files are pre-sized webp.
            unoptimized
            className="object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-card" />
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            {card.recommended ? (
              <Badge className="border-white/30 bg-black/40 text-white backdrop-blur-md">
                <Sparkles className="size-3" />
                {t("recommended")}
              </Badge>
            ) : (
              <span />
            )}
            {isCurrent && (
              <Badge className="border-white/30 bg-white/80 text-black backdrop-blur-md">
                {t("currentPlan")}
              </Badge>
            )}
          </div>
        </div>

        <div className="relative -mt-6 flex flex-1 flex-col gap-5 px-6 pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">
              {card.name}
            </h2>
            <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
              {card.shortDescription}
            </p>
          </div>

          <div>
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="whitespace-nowrap text-4xl font-bold tracking-tight tabular-nums">
                {formatPlanPrice(monthly, card.currency, locale)}
              </span>
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {t("perMonth")}
              </span>
            </p>
            <p className="h-4 text-xs text-muted-foreground">
              {showAnnual
                ? t("billedAnnually", {
                    price: formatPlanPrice(
                      card.annualPrice!,
                      card.currency,
                      locale,
                    ),
                  })
                : card.code === null
                  ? t("freeForever")
                  : null}
            </p>
          </div>

          {card.recommended && card.action === "upgrade" ? (
            <GlowButton
              className="w-full"
              disabled={pending !== null}
              onClick={action.onClick}
            >
              {actionContent}
            </GlowButton>
          ) : (
            <Button
              className="w-full"
              variant={action.variant}
              disabled={!action.onClick || pending !== null}
              onClick={action.onClick}
            >
              {actionContent}
            </Button>
          )}

          <div className="flex-1 space-y-4 border-t pt-5 text-sm">
            {card.includesName && (
              <p className="font-medium">
                {t("everythingIn", { plan: card.includesName })}
              </p>
            )}
            {card.unlockedModels.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("modelsHeading")}
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {models.map((model) => (
                    <li
                      key={`${model.provider}/${model.name}`}
                      className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
                    >
                      <ModelProviderIcon
                        provider={model.provider}
                        className="size-3.5 shrink-0"
                      />
                      <span>{model.name}</span>
                    </li>
                  ))}
                  {hiddenModels > 0 && (
                    <li>
                      <button
                        type="button"
                        className="rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setShowAllModels(true)}
                      >
                        {t("moreModels", { count: hiddenModels })}
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {card.features.length > 0 && (
              <ul className="space-y-2">
                {card.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-fuchsia-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
