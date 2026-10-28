import { PlanForm } from "@/components/admin/plans/plan-form";
import { requireAdminPermission } from "auth/permissions";
import { planRepository } from "lib/db/repository";
import { notFound, unauthorized } from "next/navigation";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdminPermission();
  } catch {
    unauthorized();
  }

  const plan = await planRepository.getById((await params).id);
  if (!plan) notFound();

  return <PlanForm plan={plan} />;
}
