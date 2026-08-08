import { describe, expect, it } from "vitest";
import { ChatSteeringQueue, isChatRequestActive } from "./use-chat-steering";

describe("chat steering", () => {
  it("recognizes only in-flight request states", () => {
    expect(isChatRequestActive("submitted")).toBe(true);
    expect(isChatRequestActive("streaming")).toBe(true);
    expect(isChatRequestActive("ready")).toBe(false);
    expect(isChatRequestActive("error")).toBe(false);
  });

  it("holds one replacement message until the aborted request is ready", () => {
    const queue = new ChatSteeringQueue<string>();

    expect(queue.enqueue("steer the response")).toBe(true);
    expect(queue.enqueue("do not replace the first steer")).toBe(false);
    expect(queue.takeWhenReady("streaming")).toBeUndefined();
    expect(queue.takeWhenReady("ready")).toBe("steer the response");
    expect(queue.takeWhenReady("ready")).toBeUndefined();
  });
});
