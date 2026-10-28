"use client";

import { updateModelAccessAction } from "@/app/api/admin/model-access-actions";
import { findUnlockingPlan } from "lib/plan/model-access";
import { Loader } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Input } from "ui/input";

type PlanOption = {
  id: string;
  name: string;
  tier: number;
  active: boolean;
  price: string;
};

type ModelRule = { provider: string; model: string; minTier: number };

export function ModelAccessTable({
  providers,
  rules,
  plans,
}: {
  providers: { provider: string; models: string[] }[];
  rules: ModelRule[];
  plans: PlanOption[];
}) {
  const activePlans = plans.filter((plan) => plan.active);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Model access</h1>
        <p className="text-sm text-muted-foreground">
          Set the minimum plan tier for each model. Users without a plan are
          tier 0, so 0 means everyone. Locked models stay visible in the picker
          with an upgrade prompt, and the server rejects them.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {activePlans.length ? (
            [...activePlans]
              .sort((a, b) => a.tier - b.tier)
              .map((plan) => (
                <Badge key={plan.id} variant="outline">
                  {plan.name}: tier {plan.tier}
                </Badge>
              ))
          ) : (
            <span className="text-xs text-muted-foreground">
              No active plans yet.
            </span>
          )}
        </div>
      </div>

      {providers.map(({ provider, models }) => (
        <div key={provider} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {provider}
          </h2>
          <div className="divide-y rounded-lg border">
            {models.map((model) => (
              <ModelRow
                key={model}
                provider={provider}
                model={model}
                initialTier={
                  rules.find(
                    (r) => r.provider === provider && r.model === model,
                  )?.minTier ?? 0
                }
                plans={plans}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelRow({
  provider,
  model,
  initialTier,
  plans,
}: {
  provider: string;
  model: string;
  initialTier: number;
  plans: PlanOption[];
}) {
  const [savedTier, setSavedTier] = useState(initialTier);
  const [tier, setTier] = useState(String(initialTier));
  const [isPending, startTransition] = useTransition();

  const parsed = Number(tier);
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 1000;
  const unlockedBy = !valid
    ? null
    : parsed === 0
      ? "Everyone"
      : (findUnlockingPlan(plans, parsed)?.name ?? "No active plan");

  const save = () =>
    startTransition(async () => {
      const form = new FormData();
      form.set("provider", provider);
      form.set("model", model);
      form.set("minTier", String(parsed));
      const result = await updateModelAccessAction({}, form);
      if (!result?.success) {
        toast.error(result?.message || "Unable to save model access");
        return;
      }
      setSavedTier(parsed);
      toast.success(`${model}: saved`);
    });

  return (
    <div
      className="flex flex-wrap items-center gap-3 p-3"
      data-testid={`model-access-row-${provider}-${model}`}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {model}
      </span>
      <span className="w-40 truncate text-xs text-muted-foreground">
        {unlockedBy ? `Unlocked by: ${unlockedBy}` : "Invalid tier"}
      </span>
      <Input
        type="number"
        min={0}
        max={1000}
        step={1}
        value={tier}
        onChange={(event) => setTier(event.target.value)}
        className="w-24"
        aria-label={`Minimum tier for ${model}`}
      />
      <Button
        size="sm"
        onClick={save}
        disabled={isPending || !valid || parsed === savedTier}
      >
        {isPending && <Loader className="size-4 animate-spin" />}
        Save
      </Button>
    </div>
  );
}
