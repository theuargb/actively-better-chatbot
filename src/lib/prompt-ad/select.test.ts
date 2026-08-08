import { describe, expect, it } from "vitest";
import type { PromptAdModel, PromptAdSuggestion } from "app-types/prompt-ad";
import { selectPromptAds } from "./select";

const gpt: PromptAdModel = { provider: "openai", model: "gpt-4.1" };
const claude: PromptAdModel = { provider: "anthropic", model: "claude-opus-5" };

const suggestion = (
  id: string,
  models: PromptAdModel[] | null = null,
): PromptAdSuggestion => ({
  id,
  icon: { type: "lucide", value: "github" },
  mode: "send",
  models,
  caption: `caption ${id}`,
  prompt: `prompt ${id}`,
});

describe("selectPromptAds", () => {
  const pool = [
    suggestion("everywhere"),
    suggestion("gpt-only", [gpt]),
    suggestion("claude-only", [claude]),
    suggestion("both", [gpt, claude]),
  ];

  it("keeps only ads the current model supports", () => {
    const ids = selectPromptAds(pool, { model: gpt, count: 10 })
      .map((ad) => ad.id)
      .sort();
    expect(ids).toEqual(["both", "everywhere", "gpt-only"]);
  });

  it("re-picks for a different model", () => {
    const ids = selectPromptAds(pool, { model: claude, count: 10 })
      .map((ad) => ad.id)
      .sort();
    expect(ids).toEqual(["both", "claude-only", "everywhere"]);
  });

  it("shows only unscoped ads while the model is unknown", () => {
    expect(selectPromptAds(pool, { count: 10 }).map((ad) => ad.id)).toEqual([
      "everywhere",
    ]);
  });

  it("never returns more than the configured count", () => {
    expect(selectPromptAds(pool, { model: gpt, count: 2 })).toHaveLength(2);
  });

  it("returns nothing when the count is zero", () => {
    expect(selectPromptAds(pool, { model: gpt, count: 0 })).toEqual([]);
  });

  it("leaves the pool untouched", () => {
    const before = pool.map((ad) => ad.id);
    selectPromptAds(pool, { model: gpt, count: 2 });
    expect(pool.map((ad) => ad.id)).toEqual(before);
  });
});
