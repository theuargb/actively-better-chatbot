import { PlanForm } from "@/components/admin/plans/plan-form";
import { requireAdminPermission } from "auth/permissions";
import { unauthorized } from "next/navigation";

export default async function NewPlanPage() {
  try {
    await requireAdminPermission();
  } catch {
    unauthorized();
  }

  return <PlanForm />;
}
