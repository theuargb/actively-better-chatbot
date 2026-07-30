import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PLAN_CURRENCY,
  formatPlanPrice,
  getPlanCurrency,
} from "./currency";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPlanCurrency", () => {
  it("returns the configured code", () => {
    vi.stubEnv("PLAN_CURRENCY", "EUR");
    expect(getPlanCurrency()).toBe("EUR");
  });

  it("normalizes case and surrounding whitespace", () => {
    vi.stubEnv("PLAN_CURRENCY", "  usd ");
    expect(getPlanCurrency()).toBe("USD");
  });

  it("falls back to USD when unset", () => {
    vi.stubEnv("PLAN_CURRENCY", "");
    expect(getPlanCurrency()).toBe(DEFAULT_PLAN_CURRENCY);
  });

  it("falls back to USD when the value is only whitespace", () => {
    vi.stubEnv("PLAN_CURRENCY", "   ");
    expect(getPlanCurrency()).toBe("USD");
  });

  it("rejects codes that are not ISO 4217 shaped", () => {
    vi.stubEnv("PLAN_CURRENCY", "DOLLARS");
    expect(() => getPlanCurrency()).toThrow(/3-letter ISO 4217/);
  });
});

describe("formatPlanPrice", () => {
  it("formats a decimal string as currency", () => {
    expect(formatPlanPrice("19.00", "USD", "en-US")).toBe("$19.00");
  });

  it("accepts numbers as well as strings", () => {
    expect(formatPlanPrice(0, "USD", "en-US")).toBe("$0.00");
  });

  it("falls back to a plain rendering for unknown codes", () => {
    expect(formatPlanPrice("5", "ZZZ", "en-US")).toContain("5");
  });

  it("passes through unparseable amounts", () => {
    expect(formatPlanPrice("n/a", "USD", "en-US")).toBe("USD n/a");
  });
});
