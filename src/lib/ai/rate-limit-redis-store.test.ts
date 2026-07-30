import { describe, expect, it } from "vitest";
import {
  AiRateLimiter,
  RedisRateLimitStore,
  type RateLimitRedis,
} from "./rate-limit";

/**
 * Faithful stand-in for the slice of ioredis the store uses, including the
 * detail that actually matters: ioredis unshifts `numberOfKeys` onto the
 * arguments only when it was given as a number. Defining the command with a
 * fixed count would therefore push every key into ARGV and leave KEYS empty,
 * which the real Lua script treats as "nothing to limit" and silently allows.
 */
class FakeRedis implements RateLimitRedis {
  private definition?: { lua: string; numberOfKeys?: number };
  private counters = new Map<string, { count: number; expiresAt: number }>();
  lastKeys: string[] = [];
  lastArgv: string[] = [];
  reserveRateLimits?: (
    ...args: (string | number)[]
  ) => Promise<[number, number] | null>;

  defineCommand(
    _name: string,
    definition: { lua: string; numberOfKeys?: number },
  ) {
    this.definition = definition;
    this.reserveRateLimits = async (...args) => {
      const full =
        typeof definition.numberOfKeys === "number"
          ? [definition.numberOfKeys, ...args]
          : args;
      const numKeys = Number(full[0]);
      this.lastKeys = full.slice(1, 1 + numKeys).map(String);
      this.lastArgv = full.slice(1 + numKeys).map(String);
      return this.evaluate(this.lastKeys, this.lastArgv);
    };
  }

  get lua() {
    return this.definition?.lua ?? "";
  }

  /** JS port of RESERVE_SCRIPT, matching its 1-based ARGV pairing. */
  private evaluate(keys: string[], argv: string[]): [number, number] {
    const now = Date.now();
    const live = (key: string) => {
      const entry = this.counters.get(key);
      return entry && entry.expiresAt > now ? entry : undefined;
    };

    for (let i = 0; i < keys.length; i++) {
      const limit = Number(argv[i * 2]);
      const ttl = Number(argv[i * 2 + 1]);
      const current = live(keys[i])?.count ?? 0;
      if (current >= limit) {
        const entry = live(keys[i]);
        return [i + 1, entry ? entry.expiresAt - now : ttl];
      }
    }

    for (let i = 0; i < keys.length; i++) {
      const ttl = Number(argv[i * 2 + 1]);
      const entry = live(keys[i]);
      this.counters.set(
        keys[i],
        entry
          ? { ...entry, count: entry.count + 1 }
          : { count: 1, expiresAt: now + ttl },
      );
    }
    return [0, 0];
  }

  countOf(key: string) {
    return this.counters.get(key)?.count ?? 0;
  }

  get keyCount() {
    return this.counters.size;
  }
}

describe("RedisRateLimitStore", () => {
  it("registers the script without a fixed key count", () => {
    const redis = new FakeRedis();
    new RedisRateLimitStore(redis);
    // A number here would send every key as ARGV and disable limiting entirely.
    expect(redis.lua).toContain("KEYS");
  });

  it("passes rule keys through KEYS, not ARGV", async () => {
    const redis = new FakeRedis();
    const store = new RedisRateLimitStore(redis);

    await store.reserve([
      { key: "role:ADMIN:user-1", window: "hour", limit: 10 },
    ]);

    expect(redis.lastKeys).toEqual(["ai:rate:v2:role:ADMIN:user-1:hour"]);
    expect(redis.lastArgv).toEqual(["10", String(60 * 60 * 1000)]);
  });

  it("actually writes counters to redis", async () => {
    const redis = new FakeRedis();
    const store = new RedisRateLimitStore(redis);
    const rule = {
      key: "role:ADMIN:user-1",
      window: "hour" as const,
      limit: 10,
    };

    await store.reserve([rule]);
    await store.reserve([rule]);

    expect(redis.keyCount).toBe(1);
    expect(redis.countOf("ai:rate:v2:role:ADMIN:user-1:hour")).toBe(2);
  });

  it("enforces the limit end to end through the limiter", async () => {
    const redis = new FakeRedis();
    const limiter = new AiRateLimiter(new RedisRateLimitStore(redis));
    process.env.AI_RATE_LIMIT_ROLE_ADMIN_PER_HOUR = "2";

    try {
      const context = { userId: "user-1", roles: ["admin"] };
      expect((await limiter.check(context)).ok).toBe(true);
      expect((await limiter.check(context)).ok).toBe(true);

      const blocked = await limiter.check(context);
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) {
        expect(blocked.limit).toBe(2);
        expect(blocked.window).toBe("hour");
      }
    } finally {
      delete process.env.AI_RATE_LIMIT_ROLE_ADMIN_PER_HOUR;
    }
  });

  it("interleaves limits and ttls per rule across several scopes", async () => {
    const redis = new FakeRedis();
    const store = new RedisRateLimitStore(redis);

    await store.reserve([
      { key: "role:ADMIN:u", window: "hour", limit: 10 },
      { key: "plan:PLUS:u", window: "day", limit: 50 },
    ]);

    expect(redis.lastKeys).toEqual([
      "ai:rate:v2:role:ADMIN:u:hour",
      "ai:rate:v2:plan:PLUS:u:day",
    ]);
    expect(redis.lastArgv).toEqual([
      "10",
      String(60 * 60 * 1000),
      "50",
      String(24 * 60 * 60 * 1000),
    ]);
  });

  it("leaves every counter untouched when one scope is already exhausted", async () => {
    const redis = new FakeRedis();
    const store = new RedisRateLimitStore(redis);
    const tight = { key: "model:M:u", window: "day" as const, limit: 1 };
    const roomy = { key: "plan:PLUS:u", window: "day" as const, limit: 50 };

    await store.reserve([roomy, tight]);
    const rejected = await store.reserve([roomy, tight]);

    expect(rejected.ok).toBe(false);
    expect(redis.countOf("ai:rate:v2:plan:PLUS:u:day")).toBe(1);
  });
});
