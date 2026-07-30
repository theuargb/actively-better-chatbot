import "server-only";

import { eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { PlanTable, UserTable } from "lib/db/pg/schema.pg";

export async function getUserPlanCode(userId: string) {
  const [result] = await pgDb
    .select({ planCode: PlanTable.code })
    .from(UserTable)
    .leftJoin(PlanTable, eq(UserTable.planId, PlanTable.id))
    .where(eq(UserTable.id, userId));
  return result?.planCode ?? null;
}

export const parseRoles = (role: string | null | undefined) =>
  (role ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
