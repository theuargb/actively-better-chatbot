import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PromptAd } from "app-types/prompt-ad";

vi.mock("server-only", () => ({}));
vi.mock("logger", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const selectEnabled = vi.fn();
vi.mock("lib/db/repository", () => ({
  promptAdRepository: {
    selectEnabled: (...args: unknown[]) => selectEnabled(...args),
  },
}));

const cacheStore = new Map<string, unknown>();
vi.mock("lib/cache", () => ({
  serverCache: {
    get: async (key: string) => cacheStore.get(key),
    set: async (key: string, value: unknown) => {
      cacheStore.set(key, value);
    },
    delete: async (key: string) => {
      cacheStore.delete(key);
    },
  },
}));

vi.mock("@/i18n/get-locale", () => ({
  getLocaleAction: async () => "en",
}));

const ad = (overrides: Partial<PromptAd> = {}): PromptAd => ({
  id: crypto.randomUUID(),
  icon: { type: "lucide", value: "github" },
  mode: "send",
  enabled: true,
  expiresAt: null,
  models: null,
  variants: [
    { locale: "en", caption: "en caption", prompt: "en prompt" },
    { locale: "fr", caption: "fr caption", prompt: "fr prompt" },
  ],
  createdBy: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const importServer = async () => await import("./server");

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  cacheStore.clear();
  selectEnabled.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPromptAdsCount", () => {
  it("defaults to 3 when unset", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", undefined as unknown as string);
    const { getPromptAdsCount } = await importServer();
    expect(getPromptAdsCount()).toBe(3);
  });

  it("reads the configured value", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "5");
    const { getPromptAdsCount } = await importServer();
    expect(getPromptAdsCount()).toBe(5);
  });

  it("treats 0 as disabled", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "0");
    const { getPromptAdsCount } = await importServer();
    expect(getPromptAdsCount()).toBe(0);
  });

  it("falls back on garbage and negatives", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "abc");
    const { getPromptAdsCount } = await importServer();
    expect(getPromptAdsCount()).toBe(3);

    vi.stubEnv("PROMPT_ADS_COUNT", "-2");
    expect(getPromptAdsCount()).toBe(3);
  });
});

describe("getPromptAdsForLocale", () => {
  it("returns nothing and skips the query when disabled", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "0");
    const { getPromptAdsForLocale } = await importServer();
    expect(await getPromptAdsForLocale("en")).toEqual({ ads: [], count: 0 });
    expect(selectEnabled).not.toHaveBeenCalled();
  });

  it("ships the whole pool plus the count, so the client can re-pick", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "2");
    selectEnabled.mockResolvedValue([ad(), ad(), ad(), ad()]);
    const { getPromptAdsForLocale } = await importServer();
    const payload = await getPromptAdsForLocale("en");
    expect(payload.ads).toHaveLength(4);
    expect(payload.count).toBe(2);
  });

  it("carries the model scope through to the client", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "3");
    const models = [{ provider: "openai", model: "gpt-4.1" }];
    selectEnabled.mockResolvedValue([ad({ models })]);
    const { getPromptAdsForLocale } = await importServer();
    const { ads } = await getPromptAdsForLocale("en");
    expect(ads[0].models).toEqual(models);
  });

  it("resolves captions for the requested locale", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "1");
    selectEnabled.mockResolvedValue([ad()]);
    const { getPromptAdsForLocale } = await importServer();
    const { ads } = await getPromptAdsForLocale("fr");
    expect(ads[0].caption).toBe("fr caption");
    expect(ads[0].prompt).toBe("fr prompt");
  });

  it("drops disabled and expired ads", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "5");
    selectEnabled.mockResolvedValue([
      ad({ enabled: false }),
      ad({ expiresAt: new Date(Date.now() - 1000) }),
      ad(),
    ]);
    const { getPromptAdsForLocale } = await importServer();
    expect((await getPromptAdsForLocale("en")).ads).toHaveLength(1);
  });

  it("serves later calls from the cache", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "3");
    selectEnabled.mockResolvedValue([ad()]);
    const { getPromptAdsForLocale } = await importServer();
    await getPromptAdsForLocale("en");
    await getPromptAdsForLocale("en");
    expect(selectEnabled).toHaveBeenCalledTimes(1);
  });

  it("never breaks a new chat when the query fails", async () => {
    vi.stubEnv("PROMPT_ADS_COUNT", "3");
    selectEnabled.mockRejectedValue(new Error("db down"));
    const { getPromptAdsForLocale } = await importServer();
    expect(await getPromptAdsForLocale("en")).toEqual({ ads: [], count: 3 });
  });
});
