import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { FALLBACK_MODEL_IDENTITY, customModelProvider } = await import(
  "./models"
);

describe("customModelProvider.resolveModel", () => {
  const knownModel = customModelProvider.modelsInfo.flatMap((provider) =>
    provider.models.map((model) => ({
      provider: provider.provider,
      model: model.name,
    })),
  )[0];

  it("returns the requested identity for a known model", () => {
    const resolved = customModelProvider.resolveModel(knownModel);
    expect(resolved.identity).toEqual(knownModel);
  });

  it("bills an unknown model against the fallback identity", () => {
    const resolved = customModelProvider.resolveModel({
      provider: "openai",
      model: "definitely-not-a-model",
    });
    expect(resolved.identity).toEqual(FALLBACK_MODEL_IDENTITY);
  });

  it("bills an unknown provider against the fallback identity", () => {
    const resolved = customModelProvider.resolveModel({
      provider: "made-up-provider",
      model: "gpt-4.1",
    });
    expect(resolved.identity).toEqual(FALLBACK_MODEL_IDENTITY);
  });

  it("bills an absent selection against the fallback identity", () => {
    expect(customModelProvider.resolveModel(undefined).identity).toEqual(
      FALLBACK_MODEL_IDENTITY,
    );
  });

  it("keeps getModel and resolveModel in agreement", () => {
    for (const selection of [
      knownModel,
      { provider: "openai", model: "definitely-not-a-model" },
      undefined,
    ]) {
      expect(customModelProvider.getModel(selection)).toBe(
        customModelProvider.resolveModel(selection).model,
      );
    }
  });
});
