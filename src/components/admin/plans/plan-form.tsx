"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader } from "lucide-react";
import { toast } from "sonner";
import { Plan } from "app-types/plan";
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

export function PlanForm({
  plan,
  currency,
}: {
  plan?: Plan;
  currency: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(plan?.active ?? true);
  const [code, setCode] = useState(plan?.code ?? "");
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
            Plans are managed by admins only and drive per-plan AI limits.
          </p>
        </div>
      </div>

      <form action={submit} className="space-y-6">
        {plan && <input type="hidden" name="id" value={plan.id} />}

        <Card>
          <CardHeader>
            <CardTitle>Plan details</CardTitle>
            <CardDescription>
              The code namespaces this plan&apos;s environment keys, so changing
              it moves its limits and counters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                label="Code"
                hint={
                  code ? (
                    <>
                      Key prefix{" "}
                      <code className="font-mono text-foreground">
                        AI_RATE_LIMIT_PLAN_{normalizeCodePreview(code)}
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
                  pattern="[A-Za-z0-9_-]+"
                  placeholder="plus"
                  className="font-mono"
                />
              </Field>
              <Field label="Price" hint={`Amount in ${currency}.`}>
                <Input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={plan?.price}
                  required
                  placeholder="0.00"
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

/** Mirrors normalizeRateLimitKeyPart so admins can see the key they are creating. */
const normalizeCodePreview = (code: string) =>
  code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

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
