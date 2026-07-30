import Redis, { type RedisOptions } from "ioredis";
import logger from "logger";

declare global {
  // eslint-disable-next-line no-var
  var __server__redis__: Redis | null | undefined;
}

export const REDIS_OPTIONS: RedisOptions = {
  enableOfflineQueue: true,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 5000,
};

const createRedisClient = (): Redis | null => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  const client = new Redis(redisUrl, REDIS_OPTIONS);
  // Without a listener an emitted 'error' would crash the process.
  client.on("error", (error: Error) => {
    logger.error(`Redis connection error: ${error.message}`);
  });
  return client;
};

/**
 * Shared connection for every server-side Redis consumer. Cached on globalThis
 * so dev hot-reloads reuse one socket instead of leaking a client per reload.
 * Returns null when REDIS_URL is unset, letting callers degrade gracefully.
 */
export const getRedisClient = (): Redis | null => {
  if (globalThis.__server__redis__ === undefined) {
    globalThis.__server__redis__ = createRedisClient();
  }
  return globalThis.__server__redis__;
};
