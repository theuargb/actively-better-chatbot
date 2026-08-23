import { describe, expect, it } from "vitest";
import {
  canUseDefaultImageTool,
  resolveImageToolProvider,
} from "./resolve-provider";

describe("resolveImageToolProvider", () => {
  it("prefers Google when both image providers are configured", () => {
    expect(
      resolveImageToolProvider({
        GOOGLE_GENERATIVE_AI_API_KEY: "google-key",
        OPENAI_API_KEY: "openai-key",
      }),
    ).toBe("google");
  });

  it("falls back to OpenAI when Google is unavailable", () => {
    expect(resolveImageToolProvider({ OPENAI_API_KEY: "openai-key" })).toBe(
      "openai",
    );
  });

  it("does not select a provider without an image API key", () => {
    expect(resolveImageToolProvider({})).toBeUndefined();
  });
});

describe("canUseDefaultImageTool", () => {
  it("enables image generation for tool-capable models", () => {
    expect(
      canUseDefaultImageTool({ supportToolCall: true, toolChoice: "auto" }),
    ).toBe(true);
  });

  it("disables image generation when tools are disabled or unsupported", () => {
    expect(
      canUseDefaultImageTool({ supportToolCall: true, toolChoice: "none" }),
    ).toBe(false);
    expect(
      canUseDefaultImageTool({ supportToolCall: false, toolChoice: "auto" }),
    ).toBe(false);
  });
});
