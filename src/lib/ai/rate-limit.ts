import logger from "logger";
import { getRedisClient } from "lib/redis";
import { modelConfigKey, readJsonEnv } from "lib/env-json";
import { z } from "zod";
import type { RateLimitMessagePayload } from "./rate-limit-message";

export type RateLimitCheckResult =
  | { ok: true }
  | ({ ok: false } & Omit<RateLimitMessagePayload, "offer">);

export type RateLimitWindow = "hour" | "day";
export type RateLimitScope = "role" | "plan" | "model";

export interface AiRateLimitContext {
  userId: string;
  roles?: string[];
  planCode?: string | null;
  model?: { provider: string; model: string };
}

type Rule = {
  key: string;
  window: RateLimitWindow;
  limit: number;
};

type ReserveResult = {
  ok: boolean;
  failed?: { limit: number; window: RateLimitWindow; ttlMs: number };
};

const WINDOW_MS: Record<RateLimitWindow, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

const REDIS_KEY_PREFIX = "ai:rate:v2";

const LimitEntrySchema = z
  .object({
    perHour: z.number().int().positive().optional(),
    perDay: z.number().int().positive().optional(),
    maxChatLen: z.number().int().positive().optional(),
  })
  .strict();
const ScopeMapSchema = z.record(z.string(), LimitEntrySchema);
const RateLimitsSchema = z
  .object({
    roles: ScopeMapSchema.optional(),
    plans: ScopeMapSchema.optional(),
    models: ScopeMapSchema.optional(),
  })
  .strict();

/**
 * `AI_RATE_LIMITS`: roles, plans and models each map an exact identity (role
 * name, plan code, "<provider>/<model>") to its limits.
 */
export const getRateLimitConfig = () =>
  readJsonEnv("AI_RATE_LIMITS", RateLimitsSchema, {});

const SCOPE_FIELD = { role: "roles", plan: "plans", model: "models" } as const;

/**
 * Every scope that could govern this request: each of the user's roles, their
 * assigned plan, and the model they picked. Order matters — it decides the
 * winner when two scopes configure the same value.
 */
const scopeIdentities = (
  context: Pick<AiRateLimitContext, "roles" | "planCode" | "model">,
): Array<{ scope: RateLimitScope; value: string }> => [
  ...(context.roles ?? []).map((value) => ({ scope: "role" as const, value })),
  ...(context.planCode
    ? [{ scope: "plan" as const, value: context.planCode }]
    : []),
  ...(context.model
    ? [{ scope: "model" as const, value: modelConfigKey(context.model) }]
    : []),
];

/** The limits configured in `AI_RATE_LIMITS` for one scope identity. */
const getScopeLimits = (scope: RateLimitScope, identity: string) =>
  getRateLimitConfig()[SCOPE_FIELD[scope]]?.[identity] ?? {};

/**
 * The scope that governs one window, i.e. the most permissive limit configured
 * in `AI_RATE_LIMITS`. Scopes with nothing configured are skipped rather than
 * treated as unlimited — otherwise a user whose plan or model sets no limit
 * would escape limits entirely.
 *
 * Ties resolve to the first scope in `scopeIdentities` order. That has to be
 * deterministic: the winner also picks the counter, so a wobbling choice would
 * hand out a fresh, unspent bucket on alternating requests.
 */
const resolveWinningScope = (
  context: Pick<AiRateLimitContext, "roles" | "planCode" | "model">,
  window: RateLimitWindow,
) =>
  scopeIdentities(context).reduce<
    { scope: RateLimitScope; identity: string; limit: number } | undefined
  >((best, { scope, value }) => {
    const limits = getScopeLimits(scope, value);
    const limit = window === "hour" ? limits.perHour : limits.perDay;
    if (limit === undefined || (best && limit <= best.limit)) return best;
    return { scope, identity: value, limit };
  }, undefined);

/** The request limit for one window, `undefined` when nothing caps it. */
export const getWindowLimit = (
  context: Pick<AiRateLimitContext, "roles" | "planCode" | "model">,
  window: RateLimitWindow,
) => resolveWinningScope(context, window)?.limit;

/**
 * Longest persistent thread the user may extend, in user messages. Role, plan
 * and model caps resolve like request limits: the highest configured cap wins,
 * and scopes with nothing configured are ignored.
 */
export const getMaxChatLength = (
  context: Pick<AiRateLimitContext, "roles" | "planCode" | "model">,
) => {
  const caps = scopeIdentities(context)
    .map(({ scope, value }) => getScopeLimits(scope, value).maxChatLen)
    .filter((value): value is number => Boolean(value));
  return caps.length ? Math.max(...caps) : undefined;
};

export interface RateLimitStore {
  reserve(rules: Rule[]): Promise<ReserveResult>;
}

/**
 * The slice of ioredis this store needs. Narrowing it keeps the Lua wiring
 * testable without standing up a real server.
 */
export interface RateLimitRedis {
  defineCommand(
    name: string,
    definition: { lua: string; numberOfKeys?: number },
  ): void;
  reserveRateLimits?: (
    ...args: (string | number)[]
  ) => Promise<[number, number] | null>;
}

/**
 * Reserves every scope or none of them. Checking and incrementing in one script
 * keeps concurrent app instances from both passing a check that only one of them
 * had budget for, and stops a rejected request from consuming an unrelated scope.
 *
 * KEYS  counter key per rule
 * ARGV  limit and window TTL (ms) per rule, interleaved
 * reply [failedIndex, pttl] - failedIndex 0 means every scope was reserved
 */
const RESERVE_SCRIPT = `
for i = 1, #KEYS do
  local limit = tonumber(ARGV[(i - 1) * 2 + 1])
  local current = tonumber(redis.call('GET', KEYS[i]) or '0')
  if current >= limit then
    local pttl = redis.call('PTTL', KEYS[i])
    if pttl < 0 then pttl = tonumber(ARGV[(i - 1) * 2 + 2]) end
    return { i, pttl }
  end
end
for i = 1, #KEYS do
  if redis.call('INCR', KEYS[i]) == 1 then
    redis.call('PEXPIRE', KEYS[i], tonumber(ARGV[(i - 1) * 2 + 2]))
  end
end
return { 0, 0 }
`;

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: RateLimitRedis) {
    // numberOfKeys is deliberately omitted: ioredis only unshifts a fixed count
    // when it is a number, so leaving it out lets us pass the key count as the
    // first argument per call. Setting it here would make every key land in
    // ARGV instead of KEYS, and the script would silently allow everything.
    this.redis.defineCommand("reserveRateLimits", { lua: RESERVE_SCRIPT });
  }

  async reserve(rules: Rule[]): Promise<ReserveResult> {
    const keys = rules.map(
      (rule) => `${REDIS_KEY_PREFIX}:${rule.key}:${rule.window}`,
    );
    const args = rules.flatMap((rule) => [
      String(rule.limit),
      String(WINDOW_MS[rule.window]),
    ]);

    const reply = await this.redis.reserveRateLimits!(
      keys.length,
      ...keys,
      ...args,
    );
    const [failedIndex, ttlMs] = reply ?? [0, 0];

    if (!failedIndex) return { ok: true };
    const rule = rules[failedIndex - 1];
    return {
      ok: false,
      failed: { limit: rule.limit, window: rule.window, ttlMs },
    };
  }
}

export class AiRateLimiter {
  private store: RateLimitStore;

  constructor(store: RateLimitStore) {
    this.store = store;
  }

  /**
   * At most one rule per window: the most permissive scope governs, and the
   * request is charged to that scope's counter. Each window resolves on its own,
   * so the plan can win perHour while a role wins perDay. Identities are encoded
   * because model names may contain spaces, "/" or ":".
   */
  private rules(context: AiRateLimitContext): Rule[] {
    return (["hour", "day"] as const).flatMap((window) => {
      const winner = resolveWinningScope(context, window);
      return winner
        ? [
            {
              key: `${winner.scope}:${encodeURIComponent(winner.identity)}:${context.userId}`,
              window,
              limit: winner.limit,
            },
          ]
        : [];
    });
  }

  async check(context: AiRateLimitContext): Promise<RateLimitCheckResult> {
    const rules = this.rules(context);
    if (!rules.length) return { ok: true };

    const result = await this.store.reserve(rules);
    if (result.ok) return { ok: true };

    const failed = result.failed!;
    logger.warn(
      `AI rate limit exceeded: user=${context.userId} window=${failed.window} limit=${failed.limit}`,
    );
    return {
      ok: false,
      window: failed.window,
      limit: failed.limit,
      retryAfterSeconds: Math.max(1, Math.ceil(failed.ttlMs / 1000)),
    };
  }
}

let limiter: AiRateLimiter | null = null;

/**
 * Returns null when Redis is unavailable, which disables request limiting.
 * Thread-length caps are unaffected: they read `AI_RATE_LIMITS` only and need
 * no counters.
 */
export const getAiRateLimiter = () => {
  const redis = getRedisClient();
  if (!redis) return null;
  limiter ??= new AiRateLimiter(new RedisRateLimitStore(redis));
  return limiter;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; expiresAt: number }>();

  async reserve(rules: Rule[]): Promise<ReserveResult> {
    const now = Date.now();
    const live = (rule: Rule) => {
      const entry = this.store.get(`${rule.key}:${rule.window}`);
      return entry && entry.expiresAt > now ? entry : undefined;
    };

    for (const rule of rules) {
      const entry = live(rule);
      if (entry && entry.count >= rule.limit) {
        return {
          ok: false,
          failed: {
            limit: rule.limit,
            window: rule.window,
            ttlMs: entry.expiresAt - now,
          },
        };
      }
    }

    for (const rule of rules) {
      const entry = live(rule);
      this.store.set(
        `${rule.key}:${rule.window}`,
        entry
          ? { ...entry, count: entry.count + 1 }
          : { count: 1, expiresAt: now + WINDOW_MS[rule.window] },
      );
    }
    return { ok: true };
  }
}
