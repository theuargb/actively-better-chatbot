import type { PlanEntity } from "lib/db/pg/schema.pg";

export type Plan = PlanEntity;
export type PlanSummary = Pick<Plan, "id" | "code" | "name" | "active">;
