"use client";

import type { PricingCard } from "app-types/plan";
import { formatPlanPrice } from "lib/plan/currency";
import { cn } from "lib/utils";
import { Check, Loader, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { ModelProviderIcon } from "ui/model-provider-icon";

const VISIBLE_MODELS = 5;

export function PlanCard({
  card,
  annual,
  currency,
  locale,
  pending,
  onUpgrade,
  onCancel,
}: {
  card: PricingCard;
  annual: boolean;
  currency: string;
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
      variant: card.recommended ? "default" : "outline",
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

  return (
    <div
      data-testid={`pricing-plan-${card.code ?? "free"}`}
      className={cn(
        "relative flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md",
        card.recommended &&
          "border-primary ring-1 ring-primary/40 shadow-lg bg-gradient-to-b from-primary/5 to-card",
        isCurrent && "border-primary/60",
      )}
    >
      {card.recommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Sparkles className="size-3" />
          {t("recommended")}
        </Badge>
      )}

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{card.name}</h2>
          {isCurrent && <Badge variant="secondary">{t("currentPlan")}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground min-h-10">
          {card.shortDescription}
        </p>
      </div>

      <div>
        <p>
          <span className="text-4xl font-bold tracking-tight">
            {formatPlanPrice(monthly, currency, locale)}
          </span>
          <span className="text-sm text-muted-foreground">
            {" "}
            {t("perMonth")}
          </span>
        </p>
        <p className="text-xs text-muted-foreground h-4">
          {showAnnual
            ? t("billedAnnually", {
                price: formatPlanPrice(card.annualPrice!, currency, locale),
              })
            : card.code === null
              ? t("freeForever")
              : null}
        </p>
      </div>

      <Button
        className="w-full"
        variant={action.variant}
        disabled={!action.onClick || pending !== null}
        onClick={action.onClick}
      >
        {pending === card.id && <Loader className="size-4 animate-spin" />}
        {action.label}
      </Button>

      <div className="border-t pt-5 space-y-3 text-sm flex-1">
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
            <ul className="space-y-2">
              {models.map((model) => (
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
            {hiddenModels > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowAllModels(true)}
              >
                {t("moreModels", { count: hiddenModels })}
              </button>
            )}
          </div>
        )}
        {card.features.length > 0 && (
          <ul className="space-y-2">
            {card.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
