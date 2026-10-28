"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader } from "lucide-react";
import { toast } from "sonner";
import { Plan } from "app-types/plan";
import { DEFAULT_PLAN_CURRENCY } from "lib/plan/currency";
import { Button } from "ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Separator } from "ui/separator";
import { Switch } from "ui/switch";
import { Textarea } from "ui/textarea";
import {
  createPlanAction,
  updatePlanAction,
} from "@/app/api/admin/plan-actions";

export function PlanForm({ plan }: { plan?: Plan }) {
  const router = useRouter();
  const [active, setActive] = useState(plan?.active ?? true);
  const [code, setCode] = useState(plan?.code ?? "");
  const [stripePriceId, setStripePriceId] = useState(plan?.stripePriceId ?? "");
  const [isPending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    formData.set("active", String(active));
    startTransition(async () => {
      const result = plan
        ? await updatePlanAction({}, formData)
        : await createPlanAction({}, formData);
      if (!result?.success) {
        toast.error(result?.message || "Unable to save plan");
        return;
      }
      toast.success(result.message || "Plan saved");
      router.push("/admin/plans");
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2 h-8" asChild>
          <Link href="/admin/plans">
            <ArrowLeft className="size-4" />
            Back to plans
          </Link>
        </Button>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {plan ? "Edit plan" : "Create plan"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Plans drive model access (tier), AI limits (code) and Stripe
            billing.
          </p>
        </div>
      </div>

      <form action={submit} className="space-y-6">
        {plan && <input type="hidden" name="id" value={plan.id} />}

        <Card>
          <CardHeader>
            <CardTitle>Plan details</CardTitle>
            <CardDescription>
              The code keys this plan&apos;s entry in AI_RATE_LIMITS, so
              changing it moves its limits and counters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                label="Code"
                hint={
                  code ? (
                    <>
                      Rate-limit key{" "}
                      <code className="font-mono text-foreground">
                        AI_RATE_LIMITS.plans["{code.toLowerCase()}"]
                      </code>
                    </>
                  ) : (
                    "Letters, numbers, hyphens and underscores."
                  )
                }
              >
                <Input
                  name="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  readOnly={Boolean(plan?.stripePriceId)}
                  pattern="[A-Za-z0-9_-]+"
                  placeholder="plus"
                  className="font-mono"
                />
              </Field>
              <Field
                label="Price"
                hint={
                  stripePriceId.trim()
                    ? "Amount and currency are synced from Stripe on save."
                    : "Monthly amount and ISO 4217 currency code."
                }
              >
                <div className="flex gap-2">
                  <Input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={plan?.price}
                    readOnly={Boolean(stripePriceId.trim())}
                    required
                    placeholder="0.00"
                  />
                  <Input
                    name="currency"
                    aria-label="Currency"
                    defaultValue={plan?.currency ?? DEFAULT_PLAN_CURRENCY}
                    readOnly={Boolean(stripePriceId.trim())}
                    required
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    className="w-20 font-mono uppercase"
                  />
                </div>
              </Field>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <Field
                label="Tier"
                hint="0 = same as no plan. Higher tiers unlock models with that minimum tier."
              >
                <Input
                  name="tier"
                  type="number"
                  min="0"
                  max="1000"
                  step="1"
                  defaultValue={plan?.tier ?? 1}
                  required
                />
              </Field>
              <Field
                label="Stripe monthly price ID"
                hint="Leave empty to keep the plan admin-assigned only."
              >
                <Input
                  name="stripePriceId"
                  value={stripePriceId}
                  onChange={(event) => setStripePriceId(event.target.value)}
                  placeholder="price_…"
                  className="font-mono"
                />
              </Field>
              <Field
                label="Stripe annual price ID"
                hint="Optional. Needs a monthly price."
              >
                <Input
                  name="stripeAnnualPriceId"
                  defaultValue={plan?.stripeAnnualPriceId ?? ""}
                  placeholder="price_…"
                  className="font-mono"
                />
              </Field>
            </div>

            <Separator />

            <Field label="Name">
              <Input name="name" defaultValue={plan?.name} required />
            </Field>
            <Field label="Short description" hint="Shown in plan listings.">
              <Input
                name="shortDescription"
                defaultValue={plan?.shortDescription}
              />
            </Field>
            <Field label="Full description">
              <Textarea
                name="description"
                defaultValue={plan?.description}
                rows={5}
              />
            </Field>
            <Field label="Features" hint="One feature per line.">
              <Textarea
                name="features"
                defaultValue={plan?.features?.join("\n")}
                rows={6}
                placeholder={"Priority models\nLonger chats"}
              />
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="plan-active">
                  Available for new assignments
                </Label>
                <p className="text-xs text-muted-foreground">
                  Archived plans stay enforced for users who already have them.
                </p>
              </div>
              <Switch
                id="plan-active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader className="size-4 animate-spin" />}
            {plan ? "Save plan" : "Create plan"}
          </Button>
          <Button variant="ghost" type="button" asChild>
            <Link href="/admin/plans">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
