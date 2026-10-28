import { describe, expect, it } from "vitest";
import {
  buildRateLimitMessage,
  buildThreadLimitMessage,
  parseRateLimitMessage,
  parseThreadLimitMessage,
} from "./rate-limit-message";

const plus = { code: "plus", name: "Плюс|Pro", purchasable: true };

describe("rate limit message protocol", () => {
  it("round-trips a payload with and without an offer", () => {
    for (const offer of [
      null,
      { plan: plus, limit: 50 },
      { plan: { ...plus, purchasable: false }, limit: null },
    ]) {
      const payload = {
        window: "hour" as const,
        retryAfterSeconds: 90,
        limit: 5,
        offer,
      };
      expect(parseRateLimitMessage(buildRateLimitMessage(payload))).toEqual(
        payload,
      );
    }
  });

  it("drops a malformed offer but keeps the limit", () => {
    expect(
      parseRateLimitMessage("AI_RATE_LIMIT|hour|30|5|plus|Plus|1|-3"),
    ).toMatchObject({ limit: 5, offer: null });
  });

  it("rounds fractional retry seconds up", () => {
    const message = buildRateLimitMessage({
      window: "day",
      retryAfterSeconds: 12.1,
      limit: 3,
      offer: null,
    });
    expect(parseRateLimitMessage(message)?.retryAfterSeconds).toBe(13);
  });

  it("ignores unrelated error text", () => {
    expect(parseRateLimitMessage("Something broke")).toBeNull();
    expect(parseRateLimitMessage(undefined)).toBeNull();
  });

  it("rejects malformed payloads", () => {
    expect(parseRateLimitMessage("AI_RATE_LIMIT|hour|30")).toBeNull();
    expect(parseRateLimitMessage("AI_RATE_LIMIT|week|30|5")).toBeNull();
    expect(parseRateLimitMessage("AI_RATE_LIMIT|hour|abc|5")).toBeNull();
    expect(parseRateLimitMessage("AI_RATE_LIMIT|hour|30|0")).toBeNull();
  });
});

describe("thread limit message protocol", () => {
  it("round-trips the limit and offer", () => {
    const payload = { limit: 40, offer: { plan: plus, limit: 200 } };
    expect(parseThreadLimitMessage(buildThreadLimitMessage(payload))).toEqual(
      payload,
    );
    expect(parseThreadLimitMessage("AI_THREAD_LIMIT|40")).toEqual({
      limit: 40,
      offer: null,
    });
  });

  it("does not confuse the two limit kinds", () => {
    expect(parseThreadLimitMessage("AI_RATE_LIMIT|hour|30|5")).toBeNull();
    expect(parseRateLimitMessage("AI_THREAD_LIMIT|40")).toBeNull();
  });

  it("rejects missing or non-positive limits", () => {
    expect(parseThreadLimitMessage("AI_THREAD_LIMIT")).toBeNull();
    expect(parseThreadLimitMessage("AI_THREAD_LIMIT|0")).toBeNull();
    expect(parseThreadLimitMessage("AI_THREAD_LIMIT|nope")).toBeNull();
    expect(parseThreadLimitMessage(undefined)).toBeNull();
  });
});
