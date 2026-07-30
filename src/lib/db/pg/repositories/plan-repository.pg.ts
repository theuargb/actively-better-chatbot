import { Plan } from "app-types/plan";
import { asc, eq } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { PlanTable, UserTable } from "../schema.pg";

export const pgPlanRepository = {
  list: async (includeInactive = true): Promise<Plan[]> => {
    const query = db.select().from(PlanTable).orderBy(asc(PlanTable.name));
    return includeInactive
      ? await query
      : await query.where(eq(PlanTable.active, true));
  },
  getById: async (id: string): Promise<Plan | null> => {
    const [plan] = await db
      .select()
      .from(PlanTable)
      .where(eq(PlanTable.id, id));
    return plan ?? null;
  },
  create: async (plan: Omit<Plan, "id" | "createdAt" | "updatedAt">) => {
    const [created] = await db.insert(PlanTable).values(plan).returning();
    return created;
  },
  update: async (
    id: string,
    plan: Partial<Omit<Plan, "id" | "createdAt" | "updatedAt">>,
  ) => {
    const [updated] = await db
      .update(PlanTable)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(PlanTable.id, id))
      .returning();
    return updated ?? null;
  },
  getAssignedPlanId: async (userId: string): Promise<string | null> => {
    const [user] = await db
      .select({ planId: UserTable.planId })
      .from(UserTable)
      .where(eq(UserTable.id, userId));
    return user?.planId ?? null;
  },
  assignToUser: async (userId: string, planId: string | null) => {
    const [user] = await db
      .update(UserTable)
      .set({ planId, updatedAt: new Date() })
      .where(eq(UserTable.id, userId))
      .returning({ id: UserTable.id, planId: UserTable.planId });
    return user ?? null;
  },
};
