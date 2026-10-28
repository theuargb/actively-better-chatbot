/** A plan the user could move to; `purchasable` means checkout works for it. */
export type PlanOffer = { code: string; name: string; purchasable: boolean };

/** A plan that raises the limit the user just hit; `limit: null` lifts it entirely. */
export type LimitOffer = { plan: PlanOffer; limit: number | null };

type OfferablePlan = {
  code: string;
  name: string;
  tier: number;
  price: string;
  active: boolean;
  stripePriceId: string | null;
};

export const toPlanOffer = (
  plan: Pick<OfferablePlan, "code" | "name" | "stripePriceId">,
  billingEnabled: boolean,
): PlanOffer => ({
  code: plan.code,
  name: plan.name,
  purchasable: billingEnabled && Boolean(plan.stripePriceId),
});

/**
 * The cheapest higher-tier plan that actually raises `currentLimit`, preferring
 * one the user can buy. `limitFor` returns the limit the user would have on a
 * plan, `undefined` meaning no limit.
 */
export function pickLimitOffer<P extends OfferablePlan>(
  plans: P[],
  {
    currentTier,
    currentLimit,
    limitFor,
    billingEnabled,
  }: {
    currentTier: number;
    currentLimit: number;
    limitFor: (plan: P) => number | undefined;
    billingEnabled: boolean;
  },
): LimitOffer | null {
  const improving = plans
    .filter((p) => p.active && p.tier > currentTier)
    .sort((a, b) => a.tier - b.tier || Number(a.price) - Number(b.price))
    .map((p) => ({ plan: toPlanOffer(p, billingEnabled), limit: limitFor(p) }))
    .filter(({ limit }) => limit === undefined || limit > currentLimit);
  const best = improving.find((o) => o.plan.purchasable) ?? improving[0];
  return best ? { plan: best.plan, limit: best.limit ?? null } : null;
}

/*
 * Wire encoding for error messages: fields are `|`-separated, so names are
 * URI-encoded. An absent offer encodes to no fields at all.
 */
export const encodePlanOffer = (offer: PlanOffer | null): string[] =>
  offer
    ? [
        encodeURIComponent(offer.code),
        encodeURIComponent(offer.name),
        offer.purchasable ? "1" : "0",
      ]
    : [];

export const decodePlanOffer = (parts: string[]): PlanOffer | null => {
  const [code, name, purchasable] = parts;
  if (!code || !name) return null;
  try {
    return {
      code: decodeURIComponent(code),
      name: decodeURIComponent(name),
      purchasable: purchasable === "1",
    };
  } catch {
    return null;
  }
};

export const encodeLimitOffer = (offer: LimitOffer | null): string[] =>
  offer ? [...encodePlanOffer(offer.plan), String(offer.limit ?? "")] : [];

export const decodeLimitOffer = (parts: string[]): LimitOffer | null => {
  const plan = decodePlanOffer(parts);
  if (!plan) return null;
  const limit = parts[3] ? Number(parts[3]) : null;
  if (limit !== null && !(Number.isInteger(limit) && limit > 0)) return null;
  return { plan, limit };
};
