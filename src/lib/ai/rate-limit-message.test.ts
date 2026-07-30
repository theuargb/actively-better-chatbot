import { describe, expect, it } from "vitest";
import {
  buildRateLimitMessage,
  parseRateLimitMessage,
  parseThreadLimitMessage,
} from "./rate-limit-message";

describe("rate limit message protocol", () => {
  it("round-trips a payload", () => {
    const payload = {
      window: "hour" as const,
      retryAfterSeconds: 90,
      limit: 5,
    };
    expect(parseRateLimitMessage(buildRateLimitMessage(payload))).toEqual(
      payload,
    );
  });

  it("rounds fractional retry seconds up", () => {
    const message = buildRateLimitMessage({
      window: "day",
      retryAfterSeconds: 12.1,
      limit: 3,
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
  it("parses the limit", () => {
    expect(parseThreadLimitMessage("AI_THREAD_LIMIT|40")).toBe(40);
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
