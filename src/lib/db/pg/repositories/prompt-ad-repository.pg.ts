import {
  PromptAd,
  PromptAdListItem,
  PromptAdRepository,
} from "app-types/prompt-ad";
import { pgDb as db } from "../db.pg";
import { PromptAdTable, UserTable } from "../schema.pg";
import { count, desc, eq } from "drizzle-orm";

type PromptAdRow = typeof PromptAdTable.$inferSelect;

const toPromptAd = (row: PromptAdRow): PromptAd => ({
  id: row.id,
  icon: row.icon,
  mode: row.mode,
  enabled: row.enabled,
  expiresAt: row.expiresAt,
  models: row.models?.length ? row.models : null,
  variants: row.variants ?? [],
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const pgPromptAdRepository: PromptAdRepository = {
  async create(data) {
    const [result] = await db
      .insert(PromptAdTable)
      .values({
        icon: data.icon,
        mode: data.mode ?? "send",
        enabled: data.enabled ?? true,
        expiresAt: data.expiresAt ?? null,
        models: data.models?.length ? data.models : null,
        variants: data.variants,
        createdBy: data.createdBy,
      })
      .returning();
    return toPromptAd(result);
  },

  async update({ id, ...data }) {
    const [result] = await db
      .update(PromptAdTable)
      .set({
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.mode !== undefined ? { mode: data.mode } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.expiresAt !== undefined
          ? { expiresAt: data.expiresAt ?? null }
          : {}),
        ...(data.models !== undefined
          ? { models: data.models?.length ? data.models : null }
          : {}),
        ...(data.variants !== undefined ? { variants: data.variants } : {}),
        updatedAt: new Date(),
      })
      .where(eq(PromptAdTable.id, id))
      .returning();
    return toPromptAd(result);
  },

  async deleteById(id) {
    await db.delete(PromptAdTable).where(eq(PromptAdTable.id, id));
  },

  async selectById(id) {
    const [result] = await db
      .select()
      .from(PromptAdTable)
      .where(eq(PromptAdTable.id, id));
    return result ? toPromptAd(result) : null;
  },

  async selectList(query) {
    const limit = query?.limit ?? 20;
    const offset = query?.offset ?? 0;

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          ad: PromptAdTable,
          createdByName: UserTable.name,
        })
        .from(PromptAdTable)
        .leftJoin(UserTable, eq(PromptAdTable.createdBy, UserTable.id))
        .orderBy(desc(PromptAdTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(PromptAdTable),
    ]);

    const items: PromptAdListItem[] = rows.map((row) => ({
      ...toPromptAd(row.ad),
      createdByName: row.createdByName ?? null,
    }));

    return { items, total: Number(totalRow?.value ?? 0) };
  },

  async selectEnabled() {
    const rows = await db
      .select()
      .from(PromptAdTable)
      .where(eq(PromptAdTable.enabled, true))
      .orderBy(desc(PromptAdTable.createdAt));
    return rows.map(toPromptAd);
  },
};
