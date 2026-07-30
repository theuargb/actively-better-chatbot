export const RATE_LIMIT_ERROR_PREFIX = "AI_RATE_LIMIT";
export const THREAD_LIMIT_ERROR_PREFIX = "AI_THREAD_LIMIT";

export type RateLimitWindow = "hour" | "day";

export interface RateLimitMessagePayload {
  window: RateLimitWindow;
  retryAfterSeconds: number;
  limit: number;
}

export const buildRateLimitMessage = (
  payload: RateLimitMessagePayload,
): string => {
  return [
    RATE_LIMIT_ERROR_PREFIX,
    payload.window,
    Math.max(0, Math.ceil(payload.retryAfterSeconds)),
    payload.limit,
  ].join("|");
};

export const parseThreadLimitMessage = (message?: string): number | null => {
  const [prefix, rawLimit] = message?.split("|") ?? [];
  const limit = Number(rawLimit);
  return prefix === THREAD_LIMIT_ERROR_PREFIX &&
    Number.isFinite(limit) &&
    limit > 0
    ? limit
    : null;
};

export const parseRateLimitMessage = (
  message?: string,
): RateLimitMessagePayload | null => {
  if (!message) return null;
  const parts = message.split("|");
  if (parts[0] !== RATE_LIMIT_ERROR_PREFIX) return null;
  if (parts.length < 4) return null;

  const window = parts[1] as RateLimitWindow;
  const retryAfterSeconds = Number(parts[2]);
  const limit = Number(parts[3]);

  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds < 0) {
    return null;
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    return null;
  }
  if (window !== "hour" && window !== "day") {
    return null;
  }

  return {
    window,
    retryAfterSeconds,
    limit,
  };
};
