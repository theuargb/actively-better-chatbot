"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import { BasicUserWithLastLogin } from "app-types/user";
import { PlanSummary } from "app-types/plan";
import { updateUserPlanAction } from "@/app/api/admin/plan-actions";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Label } from "ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";

const NO_PLAN = "none";

export function UserPlanSelector({
  user,
  plans,
  onChange,
}: {
  user: BasicUserWithLastLogin;
  plans: PlanSummary[];
  onChange: (plan: PlanSummary | null) => void;
}) {
  const [planId, setPlanId] = useState(user.plan?.id ?? NO_PLAN);
  const [isPending, startTransition] = useTransition();

  const currentId = user.plan?.id ?? NO_PLAN;
  const isDirty = planId !== currentId;

  const save = () =>
    startTransition(async () => {
      const form = new FormData();
      form.set("userId", user.id);
      form.set("planId", planId === NO_PLAN ? "" : planId);

      const result = await updateUserPlanAction({}, form);
      if (!result?.success) {
        toast.error(result?.message || "Unable to update plan");
        return;
      }
      onChange(plans.find((plan) => plan.id === planId) ?? null);
      toast.success("User plan updated");
    });

  return (
    <div className="space-y-2">
      <Label htmlFor="user-plan">Plan</Label>
      <div className="flex gap-2">
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger id="user-plan" className="flex-1">
            <SelectValue placeholder="No plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PLAN}>
              <span className="text-muted-foreground">No plan</span>
            </SelectItem>
            {plans.map((plan) => (
              <SelectItem
                key={plan.id}
                value={plan.id}
                // Archived plans stay selectable only for the user already on them.
                disabled={!plan.active && plan.id !== user.plan?.id}
              >
                <span className="flex items-center gap-2">
                  {plan.name}
                  <code className="font-mono text-xs text-muted-foreground">
                    {plan.code}
                  </code>
                  {!plan.active && (
                    <Badge variant="secondary" className="text-[10px]">
                      Archived
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={save} disabled={isPending || !isDirty}>
          {isPending && <Loader className="size-4 animate-spin" />}
          Save
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {user.plan
          ? `Currently on ${user.plan.name}. Plan limits apply on top of role and model limits.`
          : "No plan assigned. Only role and model limits apply."}
      </p>
    </div>
  );
}
