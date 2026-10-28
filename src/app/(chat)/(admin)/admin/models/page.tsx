import { ModelAccessTable } from "@/components/admin/model-access/model-access-table";
import { requireAdminPermission } from "auth/permissions";
import { customModelProvider } from "lib/ai/models";
import { modelAccessRepository, planRepository } from "lib/db/repository";
import { unauthorized } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ModelAccessPage() {
  try {
    await requireAdminPermission();
  } catch {
    unauthorized();
  }

  const [rules, plans] = await Promise.all([
    modelAccessRepository.list(),
    planRepository.list(false),
  ]);

  return (
    <ModelAccessTable
      providers={customModelProvider.modelsInfo.map((p) => ({
        provider: p.provider,
        models: p.models.map((m) => m.name),
      }))}
      rules={rules.map(({ provider, model, minTier }) => ({
        provider,
        model,
        minTier,
      }))}
      plans={plans.map(({ id, name, tier, active, price }) => ({
        id,
        name,
        tier,
        active,
        price,
      }))}
    />
  );
}
