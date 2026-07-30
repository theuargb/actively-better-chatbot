import { PlansTable } from "@/components/admin/plans/plans-table";
import { requireAdminPermission } from "auth/permissions";
import { getAdminPlans } from "lib/admin/plan-server";
import { getPlanCurrency } from "lib/plan/currency";
import { unauthorized } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  try {
    await requireAdminPermission();
  } catch {
    unauthorized();
  }

  return (
    <PlansTable plans={await getAdminPlans()} currency={getPlanCurrency()} />
  );
}
