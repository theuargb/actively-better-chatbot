import { getSession } from "auth/server";
import { customModelProvider } from "lib/ai/models";
import { modelAccessRepository, planRepository } from "lib/db/repository";
import { annotateModelLocks } from "lib/plan/model-access";
import { planTier } from "lib/plan/effective-plan";
import { getEffectivePlan } from "lib/plan/server";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const session = await getSession();
  const [plan, rules, plans] = await Promise.all([
    session ? getEffectivePlan(session.user.id) : null,
    modelAccessRepository.list(),
    planRepository.list(false),
  ]);
  const providers = [...customModelProvider.modelsInfo].sort((a, b) => {
    if (a.hasAPIKey && !b.hasAPIKey) return -1;
    if (!a.hasAPIKey && b.hasAPIKey) return 1;
    return 0;
  });
  return Response.json(
    annotateModelLocks(providers, rules, planTier(plan), plans),
  );
};
