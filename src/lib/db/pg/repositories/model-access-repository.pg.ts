import { and, asc, eq } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { ModelAccessEntity, ModelAccessTable } from "../schema.pg";

export const pgModelAccessRepository = {
  list: async (): Promise<ModelAccessEntity[]> =>
    db
      .select()
      .from(ModelAccessTable)
      .orderBy(asc(ModelAccessTable.provider), asc(ModelAccessTable.model)),
  /** Tier 0 means "open to everyone", which is the absence of a rule. */
  set: async (provider: string, model: string, minTier: number) => {
    if (minTier === 0) {
      await db
        .delete(ModelAccessTable)
        .where(
          and(
            eq(ModelAccessTable.provider, provider),
            eq(ModelAccessTable.model, model),
          ),
        );
      return;
    }
    await db
      .insert(ModelAccessTable)
      .values({ provider, model, minTier })
      .onConflictDoUpdate({
        target: [ModelAccessTable.provider, ModelAccessTable.model],
        set: { minTier, updatedAt: new Date() },
      });
  },
};
