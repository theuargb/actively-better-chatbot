import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Plan } from "app-types/plan";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { formatPlanPrice } from "lib/plan/currency";

export function PlansTable({
  plans,
  currency,
}: {
  plans: Plan[];
  currency: string;
}) {
  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground">
            Assign and manage access plans and their AI limits.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/plans/new">
            <Plus className="size-4" />
            Create plan
          </Link>
        </Button>
      </div>

      {plans.length ? (
        <div className="divide-y rounded-lg border">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/admin/plans/${plan.id}`}
              className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium truncate">{plan.name}</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {plan.code}
                  </code>
                  {!plan.active && <Badge variant="secondary">Archived</Badge>}
                </div>
                {plan.shortDescription ? (
                  <p className="truncate text-sm text-muted-foreground">
                    {plan.shortDescription}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatPlanPrice(plan.price, currency)}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No plans yet. Create one to start applying per-plan limits.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/plans/new">
              <Plus className="size-4" />
              Create plan
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
