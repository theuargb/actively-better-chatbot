export const MODEL_LOCKED_ERROR_PREFIX = "AI_MODEL_LOCKED";

export interface ModelLockedPayload {
  model: string;
  requiredPlanName: string | null;
}

export const buildModelLockedMessage = (payload: ModelLockedPayload): string =>
  [
    MODEL_LOCKED_ERROR_PREFIX,
    encodeURIComponent(payload.model),
    encodeURIComponent(payload.requiredPlanName ?? ""),
  ].join("|");

export const parseModelLockedMessage = (
  message?: string,
): ModelLockedPayload | null => {
  const parts = message?.split("|");
  if (!parts || parts[0] !== MODEL_LOCKED_ERROR_PREFIX || parts.length < 3) {
    return null;
  }
  try {
    return {
      model: decodeURIComponent(parts[1]),
      requiredPlanName: decodeURIComponent(parts[2]) || null,
    };
  } catch {
    return null;
  }
};
