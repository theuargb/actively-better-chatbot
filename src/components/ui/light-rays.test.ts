import { describe, expect, it, vi } from "vitest";
import { supportsWebGL } from "./light-rays";

describe("supportsWebGL", () => {
  it("accepts an available WebGL context", () => {
    const canvas = {
      getContext: vi.fn().mockReturnValue({}),
    } as unknown as HTMLCanvasElement;

    expect(supportsWebGL(canvas)).toBe(true);
  });

  it("fails closed when browser security restrictions block WebGL", () => {
    const canvas = {
      getContext: vi.fn().mockImplementation(() => {
        throw new Error("WebGL is blocked");
      }),
    } as unknown as HTMLCanvasElement;

    expect(supportsWebGL(canvas)).toBe(false);
  });
});
