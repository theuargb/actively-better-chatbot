import "server-only";

import logger from "logger";
import { customModelProvider } from "lib/ai/models";
import { getRateLimitConfig } from "lib/ai/rate-limit";
import { modelConfigKey } from "lib/env-json";
import { getModelMinTiers } from "lib/plan/model-access";

const LEGACY_RATE_LIMIT_KEY = /^AI_RATE_LIMIT_(ROLE|PLAN|MODEL)_/;

/**
 * Validates the JSON env config at boot. A malformed value throws so the app
 * refuses to start rather than running with limits or model gating silently off.
 */
export function checkCustomEnvConfig(): void {
  const rateLimits = getRateLimitConfig();
  const modelTiers = getModelMinTiers();

  const known = new Set(
    customModelProvider.modelsInfo.flatMap((p) =>
      p.models.map((m) =>
        modelConfigKey({ provider: p.provider, model: m.name }),
      ),
    ),
  );
  const unknown = [
    ...Object.keys(modelTiers),
    ...Object.keys(rateLimits.models ?? {}),
  ].filter((key) => !known.has(key));
  if (unknown.length) {
    logger.warn(
      `Env model keys not in the model registry (ignored): ${[...new Set(unknown)].join(", ")}`,
    );
  }

  const legacy = Object.keys(process.env).filter((key) =>
    LEGACY_RATE_LIMIT_KEY.test(key),
  );
  if (legacy.length) {
    logger.error(
      `Legacy rate-limit env vars are no longer read; move them into AI_RATE_LIMITS: ${legacy.join(", ")}`,
    );
  }
}
