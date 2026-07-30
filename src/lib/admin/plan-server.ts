import "server-only";

import { Plan } from "app-types/plan";
import { requireAdminPermission } from "auth/permissions";
import { planRepository } from "lib/db/repository";

export async function getAdminPlans(): Promise<Plan[]> {
  await requireAdminPermission("list plans in admin panel");
  return planRepository.list(true);
}
