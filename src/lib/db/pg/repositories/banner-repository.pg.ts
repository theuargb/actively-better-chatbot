import { Banner, BannerListItem, BannerRepository } from "app-types/banner";
import { pgDb as db } from "../db.pg";
import { BannerDismissalTable, BannerTable, UserTable } from "../schema.pg";
import { asc, count, desc, eq } from "drizzle-orm";

type BannerRow = typeof BannerTable.$inferSelect;

const toBanner = (row: BannerRow): Banner => ({
  id: row.id,
  imageUrl: row.imageUrl,
  startAt: row.startAt,
  endAt: row.endAt,
  enabled: row.enabled,
  resetState: row.resetState,
  variants: row.variants ?? [],
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const pgBannerRepository: BannerRepository = {
  async create(data) {
    const [result] = await db
      .insert(BannerTable)
      .values({
        imageUrl: data.imageUrl ?? null,
        startAt: data.startAt ?? null,
        endAt: data.endAt ?? null,
        enabled: data.enabled ?? true,
        resetState: data.resetState ?? false,
        variants: data.variants,
        createdBy: data.createdBy,
      })
      .returning();
    return toBanner(result);
  },

  async update({ id, ...data }) {
    const [result] = await db
      .update(BannerTable)
      .set({
        ...(data.imageUrl !== undefined
          ? { imageUrl: data.imageUrl ?? null }
          : {}),
        ...(data.startAt !== undefined
          ? { startAt: data.startAt ?? null }
          : {}),
        ...(data.endAt !== undefined ? { endAt: data.endAt ?? null } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.resetState !== undefined
          ? { resetState: data.resetState }
          : {}),
        ...(data.variants !== undefined ? { variants: data.variants } : {}),
        updatedAt: new Date(),
      })
      .where(eq(BannerTable.id, id))
      .returning();
    return toBanner(result);
  },

  async deleteById(id) {
    await db.delete(BannerTable).where(eq(BannerTable.id, id));
  },

  async selectById(id) {
    const [result] = await db
      .select()
      .from(BannerTable)
      .where(eq(BannerTable.id, id));
    return result ? toBanner(result) : null;
  },

  async selectList(query) {
    const limit = query?.limit ?? 20;
    const offset = query?.offset ?? 0;

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          banner: BannerTable,
          createdByName: UserTable.name,
          dismissalCount: count(BannerDismissalTable.id),
        })
        .from(BannerTable)
        .leftJoin(UserTable, eq(BannerTable.createdBy, UserTable.id))
        .leftJoin(
          BannerDismissalTable,
          eq(BannerDismissalTable.bannerId, BannerTable.id),
        )
        .groupBy(BannerTable.id, UserTable.name)
        .orderBy(desc(BannerTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(BannerTable),
    ]);

    const items: BannerListItem[] = rows.map((row) => ({
      ...toBanner(row.banner),
      createdByName: row.createdByName ?? null,
      dismissalCount: Number(row.dismissalCount ?? 0),
    }));

    return { items, total: Number(totalRow?.value ?? 0) };
  },

  async selectEnabled() {
    // Oldest first: a user returning after two releases catches up in order.
    const rows = await db
      .select()
      .from(BannerTable)
      .where(eq(BannerTable.enabled, true))
      .orderBy(asc(BannerTable.createdAt));
    return rows.map(toBanner);
  },

  async selectDismissedIds(userId) {
    const rows = await db
      .select({ bannerId: BannerDismissalTable.bannerId })
      .from(BannerDismissalTable)
      .where(eq(BannerDismissalTable.userId, userId));
    return rows.map((row) => row.bannerId);
  },

  async markDismissed(userId, bannerId) {
    await db
      .insert(BannerDismissalTable)
      .values({ userId, bannerId })
      .onConflictDoNothing();
  },
};
