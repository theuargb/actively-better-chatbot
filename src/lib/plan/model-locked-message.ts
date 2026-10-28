import {
  decodePlanOffer,
  encodePlanOffer,
  type PlanOffer,
} from "./upgrade-offer";

export const MODEL_LOCKED_ERROR_PREFIX = "AI_MODEL_LOCKED";

export interface ModelLockedPayload {
  model: string;
  /** The cheapest plan that unlocks the model; null when none does. */
  requiredPlan: PlanOffer | null;
}

export const buildModelLockedMessage = (payload: ModelLockedPayload): string =>
  [
    MODEL_LOCKED_ERROR_PREFIX,
    encodeURIComponent(payload.model),
    ...encodePlanOffer(payload.requiredPlan),
  ].join("|");

export const parseModelLockedMessage = (
  message?: string,
): ModelLockedPayload | null => {
  const parts = message?.split("|");
  if (!parts || parts[0] !== MODEL_LOCKED_ERROR_PREFIX || parts.length < 2) {
    return null;
  }
  try {
    return {
      model: decodeURIComponent(parts[1]),
      requiredPlan: decodePlanOffer(parts.slice(2)),
    };
  } catch {
    return null;
  }
};
