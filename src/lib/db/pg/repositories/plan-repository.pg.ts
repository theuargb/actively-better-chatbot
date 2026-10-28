import { Plan, UserSubscriptionSummary } from "app-types/plan";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { PlanTable, SubscriptionTable, UserTable } from "../schema.pg";

/** Subscription statuses that grant access, matching the Stripe plugin's own rule. */
const ENTITLING_STATUSES = ["active", "trialing"];

export const pgPlanRepository = {
  list: async (includeInactive = true): Promise<Plan[]> => {
    const query = db
      .select()
      .from(PlanTable)
      .orderBy(asc(PlanTable.tier), asc(PlanTable.price), asc(PlanTable.name));
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
  /**
   * Both sources of entitlement for a user: the plan an admin assigned and the
   * plan of their best active/trialing paid subscription.
   */
  getEntitlementPlans: async (
    userId: string,
  ): Promise<{ assigned: Plan | null; subscribed: Plan | null }> => {
    const [assigned] = await db
      .select({ plan: PlanTable })
      .from(UserTable)
      .innerJoin(PlanTable, eq(UserTable.planId, PlanTable.id))
      .where(eq(UserTable.id, userId));
    const [subscribed] = await db
      .select({ plan: PlanTable })
      .from(SubscriptionTable)
      .innerJoin(PlanTable, eq(SubscriptionTable.plan, PlanTable.code))
      .where(
        and(
          eq(SubscriptionTable.referenceId, userId),
          inArray(SubscriptionTable.status, ENTITLING_STATUSES),
        ),
      )
      .orderBy(desc(PlanTable.tier))
      .limit(1);
    return {
      assigned: assigned?.plan ?? null,
      subscribed: subscribed?.plan ?? null,
    };
  },
  getActiveSubscription: async (
    userId: string,
  ): Promise<UserSubscriptionSummary | null> => {
    const [subscription] = await db
      .select({
        plan: SubscriptionTable.plan,
        status: SubscriptionTable.status,
        periodEnd: SubscriptionTable.periodEnd,
        cancelAtPeriodEnd: SubscriptionTable.cancelAtPeriodEnd,
        stripeSubscriptionId: SubscriptionTable.stripeSubscriptionId,
      })
      .from(SubscriptionTable)
      .where(
        and(
          eq(SubscriptionTable.referenceId, userId),
          inArray(SubscriptionTable.status, ENTITLING_STATUSES),
        ),
      )
      .orderBy(desc(SubscriptionTable.periodEnd))
      .limit(1);
    return subscription
      ? {
          ...subscription,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
        }
      : null;
  },
  listActiveSubscriptionIds: async (userId: string): Promise<string[]> => {
    const rows = await db
      .select({ id: SubscriptionTable.stripeSubscriptionId })
      .from(SubscriptionTable)
      .where(
        and(
          eq(SubscriptionTable.referenceId, userId),
          inArray(SubscriptionTable.status, ENTITLING_STATUSES),
          isNotNull(SubscriptionTable.stripeSubscriptionId),
        ),
      );
    return rows.flatMap((row) => (row.id ? [row.id] : []));
  },
};
