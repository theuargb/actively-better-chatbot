import { describe, expect, it } from "vitest";
import {
  buildModelLockedMessage,
  parseModelLockedMessage,
} from "./model-locked-message";

describe("model locked message protocol", () => {
  it("round-trips names containing the delimiter", () => {
    const payload = { model: "Claude 4", requiredPlanName: "Pro|Max" };
    expect(parseModelLockedMessage(buildModelLockedMessage(payload))).toEqual(
      payload,
    );
  });

  it("round-trips a model that no plan unlocks", () => {
    const payload = { model: "Еней 1", requiredPlanName: null };
    expect(parseModelLockedMessage(buildModelLockedMessage(payload))).toEqual(
      payload,
    );
  });

  it("ignores other error kinds and malformed text", () => {
    expect(parseModelLockedMessage("AI_RATE_LIMIT|hour|1|1")).toBeNull();
    expect(parseModelLockedMessage("AI_MODEL_LOCKED|x")).toBeNull();
    expect(parseModelLockedMessage("AI_MODEL_LOCKED|%E0%A4%A|")).toBeNull();
    expect(parseModelLockedMessage(undefined)).toBeNull();
  });
});
