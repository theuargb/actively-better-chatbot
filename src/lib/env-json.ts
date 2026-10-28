import { z } from "zod";

/** Exact identity used as a key in JSON env maps. */
export const modelConfigKey = (model: { provider: string; model: string }) =>
  `${model.provider}/${model.model}`;

const cache = new Map<string, { raw: string; value: unknown }>();

/**
 * Reads one env var holding a JSON value. Unset or blank returns `fallback`.
 * A value that is set but malformed is a misconfiguration and throws, naming the
 * variable, so a typo never silently disables what it was meant to configure.
 * The parsed value is cached per raw string.
 */
export function readJsonEnv<T>(
  name: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const hit = cache.get(name);
  if (hit?.raw === raw) return hit.value as T;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error(`${name} is not valid JSON: ${(e as Error).message}`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`${name} is invalid:\n${z.prettifyError(parsed.error)}`);
  }
  cache.set(name, { raw, value: parsed.data });
  return parsed.data;
}
