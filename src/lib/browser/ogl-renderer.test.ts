import { describe, expect, it, vi } from "vitest";
import { createOglRenderer } from "./ogl-renderer";

describe("createOglRenderer", () => {
  it("returns the renderer when initialization succeeds", () => {
    const renderer = {} as never;

    expect(createOglRenderer("Effect", {}, () => renderer)).toBe(renderer);
  });

  it("fails closed when OGL receives a null WebGL context", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(
      createOglRenderer("Effect", {}, () => {
        throw new TypeError(
          "null is not an object (evaluating 'this.gl.renderer=this')",
        );
      }),
    ).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      "Effect disabled: WebGL initialization failed",
      expect.any(TypeError),
    );

    consoleError.mockRestore();
  });
});
