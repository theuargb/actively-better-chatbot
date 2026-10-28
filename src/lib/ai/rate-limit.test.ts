import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AiRateLimiter,
  MemoryRateLimitStore,
  getMaxChatLength,
} from "./rate-limit";

const createLimiter = () => new AiRateLimiter(new MemoryRateLimitStore());

const setLimits = (config: object) =>
  vi.stubEnv("AI_RATE_LIMITS", JSON.stringify(config));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AiRateLimiter role scope", () => {
  it("allows requests under the limit", async () => {
    setLimits({ roles: { user: { perHour: 2 } } });
    const limiter = createLimiter();

    const first = await limiter.check({ userId: "user-1", roles: ["user"] });
    const second = await limiter.check({ userId: "user-1", roles: ["user"] });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("blocks when the hourly limit is exhausted", async () => {
    setLimits({ roles: { user: { perHour: 1 } } });
    const limiter = createLimiter();

    await limiter.check({ userId: "user-2", roles: ["user"] });
    const blocked = await limiter.check({ userId: "user-2", roles: ["user"] });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.window).toBe("hour");
      expect(blocked.limit).toBe(1);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("applies the daily limit when configured", async () => {
    setLimits({ roles: { editor: { perDay: 2 } } });
    const limiter = createLimiter();

    await limiter.check({ userId: "user-3", roles: ["editor"] });
    await limiter.check({ userId: "user-3", roles: ["editor"] });
    const blocked = await limiter.check({
      userId: "user-3",
      roles: ["editor"],
    });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.window).toBe("day");
      expect(blocked.limit).toBe(2);
    }
  });

  it("resets after the window expires", async () => {
    setLimits({ roles: { user: { perHour: 1 } } });
    const realNow = Date.now;
    let now = realNow();
    Date.now = () => now;

    try {
      const limiter = createLimiter();
      await limiter.check({ userId: "user-4", roles: ["user"] });
      expect(
        (await limiter.check({ userId: "user-4", roles: ["user"] })).ok,
      ).toBe(false);

      now = now + 60 * 60 * 1000 + 10;

      expect(
        (await limiter.check({ userId: "user-4", roles: ["user"] })).ok,
      ).toBe(true);
    } finally {
      Date.now = realNow;
    }
  });

  it("takes the most permissive limit across every role a user holds", async () => {
    setLimits({ roles: { user: { perDay: 1 }, admin: { perDay: 3 } } });
    const limiter = createLimiter();
    const context = { userId: "user-5", roles: ["user", "admin"] };

    for (let i = 0; i < 3; i++) {
      expect((await limiter.check(context)).ok).toBe(true);
    }
    const blocked = await limiter.check(context);

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.limit).toBe(3);
  });

  it("allows everything when no scope is configured", async () => {
    const limiter = createLimiter();
    for (let i = 0; i < 5; i++) {
      expect(
        (await limiter.check({ userId: "user-6", roles: ["user"] })).ok,
      ).toBe(true);
    }
  });
});

describe("AiRateLimiter most-permissive scope", () => {
  it("enforces the biggest configured limit across role, plan and model", async () => {
    setLimits({
      roles: { user: { perHour: 10 } },
      plans: { plus: { perHour: 15 } },
      models: { "openai/gpt-4.1": { perHour: 7 } },
    });
    const limiter = createLimiter();
    const context = {
      userId: "user-8",
      roles: ["user"],
      planCode: "plus",
      model: { provider: "openai", model: "gpt-4.1" },
    };

    // The plan is the most permissive, so it governs — not the tighter role/model.
    for (let i = 0; i < 15; i++) {
      expect((await limiter.check(context)).ok).toBe(true);
    }
    const blocked = await limiter.check(context);

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.limit).toBe(15);
  });

  it("ignores scopes with nothing configured instead of treating them as unlimited", async () => {
    setLimits({ roles: { user: { perHour: 2 } } });
    const limiter = createLimiter();
    const context = {
      userId: "user-8b",
      roles: ["user"],
      planCode: "plus",
      model: { provider: "openai", model: "gpt-4.1" },
    };

    expect((await limiter.check(context)).ok).toBe(true);
    expect((await limiter.check(context)).ok).toBe(true);

    const blocked = await limiter.check(context);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.limit).toBe(2);
  });

  it("resolves each window independently", async () => {
    setLimits({
      roles: { user: { perHour: 1, perDay: 6 } },
      plans: { plus: { perHour: 4, perDay: 2 } },
    });
    const limiter = createLimiter();
    // Plan wins the hour (4 > 1) while the role wins the day (6 > 2).
    const context = { userId: "user-8c", roles: ["user"], planCode: "plus" };

    for (let i = 0; i < 4; i++) {
      expect((await limiter.check(context)).ok).toBe(true);
    }
    const blocked = await limiter.check(context);

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.window).toBe("hour");
      expect(blocked.limit).toBe(4);
    }
  });

  it("leaves the hour counter unspent when the day limit rejects", async () => {
    setLimits({ roles: { user: { perHour: 10, perDay: 1 } } });
    const limiter = createLimiter();
    const context = { userId: "user-9", roles: ["user"] };

    expect((await limiter.check(context)).ok).toBe(true);
    const blocked = await limiter.check(context);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.window).toBe("day");

    // Lift the day cap: the rejected request must not have consumed the hour
    // budget, so nine of the ten remain.
    setLimits({ roles: { user: { perHour: 10, perDay: 100 } } });
    for (let i = 0; i < 9; i++) {
      expect((await limiter.check(context)).ok).toBe(true);
    }
    expect((await limiter.check(context)).ok).toBe(false);
  });

  it("breaks ties deterministically so spend lands on one counter", async () => {
    setLimits({
      roles: { user: { perDay: 2 } },
      plans: { plus: { perDay: 2 } },
    });
    const limiter = createLimiter();
    const context = { userId: "user-9b", roles: ["user"], planCode: "plus" };

    // A wobbling winner would alternate buckets and allow four requests.
    expect((await limiter.check(context)).ok).toBe(true);
    expect((await limiter.check(context)).ok).toBe(true);
    expect((await limiter.check(context)).ok).toBe(false);
  });

  it("keeps counters separate per user", async () => {
    setLimits({ plans: { plus: { perDay: 1 } } });
    const limiter = createLimiter();

    expect((await limiter.check({ userId: "a", planCode: "plus" })).ok).toBe(
      true,
    );
    expect((await limiter.check({ userId: "b", planCode: "plus" })).ok).toBe(
      true,
    );
    expect((await limiter.check({ userId: "a", planCode: "plus" })).ok).toBe(
      false,
    );
  });

  it("charges the plan scope of an inactive plan that is still assigned", async () => {
    setLimits({ plans: { legacy: { perDay: 1 } } });
    const limiter = createLimiter();

    expect((await limiter.check({ userId: "c", planCode: "legacy" })).ok).toBe(
      true,
    );
    expect((await limiter.check({ userId: "c", planCode: "legacy" })).ok).toBe(
      false,
    );
  });

  it("matches model limits by exact provider/model key", async () => {
    setLimits({ models: { "openai/gpt-4.1-mini": { perDay: 1 } } });
    const limiter = createLimiter();
    const context = {
      userId: "user-10",
      model: { provider: "openai", model: "gpt-4.1-mini" },
    };

    expect((await limiter.check(context)).ok).toBe(true);
    expect((await limiter.check(context)).ok).toBe(false);
  });
});

describe("getMaxChatLength", () => {
  it("returns undefined when neither scope caps the thread", () => {
    expect(
      getMaxChatLength({
        planCode: "plus",
        model: { provider: "openai", model: "gpt-4.1" },
      }),
    ).toBeUndefined();
  });

  it("uses the plan cap when only the plan is configured", () => {
    setLimits({ plans: { plus: { maxChatLen: 40 } } });
    expect(getMaxChatLength({ planCode: "plus" })).toBe(40);
  });

  it("uses the role cap when only a role is configured", () => {
    setLimits({ roles: { editor: { maxChatLen: 30 } } });
    expect(getMaxChatLength({ roles: ["editor"] })).toBe(30);
  });

  it("takes the highest cap across every role a user holds", () => {
    setLimits({
      roles: { user: { maxChatLen: 50 }, editor: { maxChatLen: 30 } },
    });
    expect(getMaxChatLength({ roles: ["user", "editor"] })).toBe(50);
  });

  it("lets a role cap win over plan and model caps when it is highest", () => {
    setLimits({
      roles: { user: { maxChatLen: 60 } },
      plans: { plus: { maxChatLen: 40 } },
      models: { "openai/gpt-4.1": { maxChatLen: 25 } },
    });
    expect(
      getMaxChatLength({
        roles: ["user"],
        planCode: "plus",
        model: { provider: "openai", model: "gpt-4.1" },
      }),
    ).toBe(60);
  });

  it("uses the biggest cap from the worked example: role 10 beats plan 2", () => {
    setLimits({
      roles: { user: { maxChatLen: 10 } },
      plans: { plus: { maxChatLen: 2 } },
    });
    expect(getMaxChatLength({ roles: ["user"], planCode: "plus" })).toBe(10);
  });

  it("ignores scopes with no cap configured rather than removing the cap", () => {
    setLimits({ roles: { user: { maxChatLen: 10 } } });
    expect(
      getMaxChatLength({
        roles: ["user"],
        planCode: "plus",
        model: { provider: "openai", model: "gpt-4.1" },
      }),
    ).toBe(10);
  });

  it("ignores role caps for roles the user does not hold", () => {
    setLimits({ roles: { admin: { maxChatLen: 5 } } });
    expect(getMaxChatLength({ roles: ["user"] })).toBeUndefined();
  });

  it("uses the model cap when only the model is configured", () => {
    setLimits({ models: { "openai/gpt-4.1": { maxChatLen: 25 } } });
    expect(
      getMaxChatLength({ model: { provider: "openai", model: "gpt-4.1" } }),
    ).toBe(25);
  });

  it("takes the highest cap when plan and model both apply", () => {
    setLimits({
      plans: { plus: { maxChatLen: 40 } },
      models: { "openai/gpt-4.1": { maxChatLen: 25 } },
    });
    expect(
      getMaxChatLength({
        planCode: "plus",
        model: { provider: "openai", model: "gpt-4.1" },
      }),
    ).toBe(40);
  });

  it("throws on non-positive or unknown limit fields", () => {
    setLimits({ plans: { plus: { maxChatLen: 0 } } });
    expect(() => getMaxChatLength({ planCode: "plus" })).toThrow(
      /AI_RATE_LIMITS is invalid/,
    );
    setLimits({ plans: { plus: { maxchatlen: 5 } } });
    expect(() => getMaxChatLength({ planCode: "plus" })).toThrow(
      /AI_RATE_LIMITS is invalid/,
    );
  });

  it("keeps Cyrillic model identities apart", () => {
    setLimits({ models: { "Еней/Юрист Еней": { maxChatLen: 5 } } });
    expect(
      getMaxChatLength({ model: { provider: "Еней", model: "Юрист Еней" } }),
    ).toBe(5);
    expect(
      getMaxChatLength({ model: { provider: "Еней", model: "Поет Еней" } }),
    ).toBeUndefined();
  });

  it("applies no cap when the user has no plan", () => {
    setLimits({ plans: { plus: { maxChatLen: 40 } } });
    expect(getMaxChatLength({ planCode: null })).toBeUndefined();
  });
});
