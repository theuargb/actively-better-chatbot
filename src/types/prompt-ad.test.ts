import { describe, expect, it } from "vitest";
import {
  PromptAdCreateSchema,
  isPromptAdActive,
  isPromptAdForModel,
  resolvePromptAdVariant,
  type PromptAdVariant,
} from "./prompt-ad";

const variant = (locale: string, caption = `${locale} caption`) =>
  ({ locale, caption, prompt: `${locale} prompt` }) as PromptAdVariant;

describe("resolvePromptAdVariant", () => {
  it("prefers the exact locale", () => {
    const ad = { variants: [variant("en"), variant("fr")] };
    expect(resolvePromptAdVariant(ad, "fr")?.caption).toBe("fr caption");
  });

  it("falls back to english when the locale is missing", () => {
    const ad = { variants: [variant("en"), variant("fr")] };
    expect(resolvePromptAdVariant(ad, "ja")?.caption).toBe("en caption");
  });

  it("falls back to the first variant when english is missing", () => {
    const ad = { variants: [variant("fr"), variant("ko")] };
    expect(resolvePromptAdVariant(ad, "ja")?.caption).toBe("fr caption");
  });

  it("returns null when there is nothing to show", () => {
    expect(resolvePromptAdVariant({ variants: [] }, "en")).toBeNull();
  });
});

describe("isPromptAdActive", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("hides disabled ads", () => {
    expect(isPromptAdActive({ enabled: false, expiresAt: null }, now)).toBe(
      false,
    );
  });

  it("hides expired ads", () => {
    const expiresAt = new Date("2025-12-31T23:59:59Z");
    expect(isPromptAdActive({ enabled: true, expiresAt }, now)).toBe(false);
  });

  it("shows enabled ads with no expiry", () => {
    expect(isPromptAdActive({ enabled: true, expiresAt: null }, now)).toBe(
      true,
    );
  });

  it("shows enabled ads that expire later", () => {
    const expiresAt = new Date("2026-01-02T00:00:00Z");
    expect(isPromptAdActive({ enabled: true, expiresAt }, now)).toBe(true);
  });
});

describe("isPromptAdForModel", () => {
  const gpt = { provider: "openai", model: "gpt-4.1" };
  const claude = { provider: "anthropic", model: "claude-sonnet-5" };

  it("shows unscoped ads for any model", () => {
    expect(isPromptAdForModel({ models: null }, gpt)).toBe(true);
    expect(isPromptAdForModel({ models: [] }, gpt)).toBe(true);
  });

  it("shows unscoped ads even before a model is known", () => {
    expect(isPromptAdForModel({ models: null })).toBe(true);
  });

  it("matches on provider and model together", () => {
    expect(isPromptAdForModel({ models: [gpt] }, gpt)).toBe(true);
    expect(isPromptAdForModel({ models: [gpt] }, claude)).toBe(false);
    expect(
      isPromptAdForModel({ models: [gpt] }, { ...gpt, provider: "azure" }),
    ).toBe(false);
  });

  it("hides scoped ads while the model is unknown", () => {
    expect(isPromptAdForModel({ models: [gpt] })).toBe(false);
  });
});

describe("PromptAdCreateSchema", () => {
  const base = {
    icon: { type: "lucide", value: "github" },
    variants: [variant("en")],
  };

  it("defaults mode and enabled", () => {
    const parsed = PromptAdCreateSchema.parse(base);
    expect(parsed.mode).toBe("send");
    expect(parsed.enabled).toBe(true);
  });

  it("accepts a model scope and treats it as optional", () => {
    expect(PromptAdCreateSchema.parse(base).models).toBeUndefined();
    const scoped = PromptAdCreateSchema.parse({
      ...base,
      models: [{ provider: "openai", model: "gpt-4.1" }],
    });
    expect(scoped.models).toHaveLength(1);
  });

  it("rejects a malformed model scope", () => {
    expect(
      PromptAdCreateSchema.safeParse({ ...base, models: [{ provider: "" }] })
        .success,
    ).toBe(false);
  });

  it("rejects duplicate locales", () => {
    const result = PromptAdCreateSchema.safeParse({
      ...base,
      variants: [variant("en"), variant("en", "other")],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty variant list", () => {
    expect(
      PromptAdCreateSchema.safeParse({ ...base, variants: [] }).success,
    ).toBe(false);
  });

  it("rejects unsupported locales", () => {
    expect(
      PromptAdCreateSchema.safeParse({ ...base, variants: [variant("de")] })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown icon type", () => {
    expect(
      PromptAdCreateSchema.safeParse({
        ...base,
        icon: { type: "svg", value: "<svg />" },
      }).success,
    ).toBe(false);
  });
});
