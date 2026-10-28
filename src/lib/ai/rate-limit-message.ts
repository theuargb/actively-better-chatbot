import {
  decodeLimitOffer,
  encodeLimitOffer,
  type LimitOffer,
} from "lib/plan/upgrade-offer";

export const RATE_LIMIT_ERROR_PREFIX = "AI_RATE_LIMIT";
export const THREAD_LIMIT_ERROR_PREFIX = "AI_THREAD_LIMIT";

export type RateLimitWindow = "hour" | "day";

export interface RateLimitMessagePayload {
  window: RateLimitWindow;
  retryAfterSeconds: number;
  limit: number;
  offer: LimitOffer | null;
}

export interface ThreadLimitMessagePayload {
  limit: number;
  offer: LimitOffer | null;
}

export const buildRateLimitMessage = (
  payload: RateLimitMessagePayload,
): string =>
  [
    RATE_LIMIT_ERROR_PREFIX,
    payload.window,
    Math.max(0, Math.ceil(payload.retryAfterSeconds)),
    payload.limit,
    ...encodeLimitOffer(payload.offer),
  ].join("|");

export const buildThreadLimitMessage = (
  payload: ThreadLimitMessagePayload,
): string =>
  [
    THREAD_LIMIT_ERROR_PREFIX,
    payload.limit,
    ...encodeLimitOffer(payload.offer),
  ].join("|");

export const parseThreadLimitMessage = (
  message?: string,
): ThreadLimitMessagePayload | null => {
  const [prefix, rawLimit, ...offer] = message?.split("|") ?? [];
  const limit = Number(rawLimit);
  return prefix === THREAD_LIMIT_ERROR_PREFIX &&
    Number.isFinite(limit) &&
    limit > 0
    ? { limit, offer: decodeLimitOffer(offer) }
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
    offer: decodeLimitOffer(parts.slice(4)),
  };
};
