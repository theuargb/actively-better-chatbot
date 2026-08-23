import { describe, expect, it } from "vitest";
import { buildImageToolSystemPrompt } from "./prompts";

describe("buildImageToolSystemPrompt", () => {
  it("limits image generation to explicit user requests", () => {
    expect(buildImageToolSystemPrompt()).toContain("explicitly asks");
    expect(buildImageToolSystemPrompt()).toContain(
      "Do not generate an image merely because a visual could be helpful.",
    );
  });
});
