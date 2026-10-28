import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { modelConfigKey, readJsonEnv } from "./env-json";

const schema = z.record(z.string(), z.number().int());

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readJsonEnv", () => {
  it("returns the fallback when unset or blank", () => {
    vi.stubEnv("TEST_JSON_ENV", undefined as unknown as string);
    expect(readJsonEnv("TEST_JSON_ENV", schema, {})).toEqual({});
    vi.stubEnv("TEST_JSON_ENV", "   ");
    expect(readJsonEnv("TEST_JSON_ENV", schema, { a: 1 })).toEqual({ a: 1 });
  });

  it("parses a valid value", () => {
    vi.stubEnv("TEST_JSON_ENV", '{"a":1,"Еней/Юрист Еней":2}');
    expect(readJsonEnv("TEST_JSON_ENV", schema, {})).toEqual({
      a: 1,
      "Еней/Юрист Еней": 2,
    });
  });

  it("throws naming the variable on malformed JSON", () => {
    vi.stubEnv("TEST_JSON_ENV", "{");
    expect(() => readJsonEnv("TEST_JSON_ENV", schema, {})).toThrow(
      /TEST_JSON_ENV is not valid JSON/,
    );
  });

  it("throws naming the variable on a schema mismatch", () => {
    vi.stubEnv("TEST_JSON_ENV", '{"a":"one"}');
    expect(() => readJsonEnv("TEST_JSON_ENV", schema, {})).toThrow(
      /TEST_JSON_ENV is invalid/,
    );
  });

  it("picks up a changed value instead of serving a stale parse", () => {
    vi.stubEnv("TEST_JSON_ENV", '{"a":1}');
    expect(readJsonEnv("TEST_JSON_ENV", schema, {})).toEqual({ a: 1 });
    vi.stubEnv("TEST_JSON_ENV", '{"a":2}');
    expect(readJsonEnv("TEST_JSON_ENV", schema, {})).toEqual({ a: 2 });
  });
});

describe("modelConfigKey", () => {
  it("keeps the exact identity, including slashes in model names", () => {
    expect(
      modelConfigKey({ provider: "openRouter", model: "qwen/qwen3-8b:free" }),
    ).toBe("openRouter/qwen/qwen3-8b:free");
  });
});
