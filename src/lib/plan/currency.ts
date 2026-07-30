const ISO_4217 = /^[A-Z]{3}$/;

export const DEFAULT_PLAN_CURRENCY = "USD";

/**
 * Plans share one app-wide currency. An unset PLAN_CURRENCY falls back to USD; a
 * value that is set but malformed still throws, since that is a misconfiguration
 * rather than an absent setting.
 */
export const getPlanCurrency = (): string => {
  const currency = process.env.PLAN_CURRENCY?.trim().toUpperCase();
  if (!currency) return DEFAULT_PLAN_CURRENCY;
  if (!ISO_4217.test(currency)) {
    throw new Error(
      `PLAN_CURRENCY must be a 3-letter ISO 4217 code, received "${currency}".`,
    );
  }
  return currency;
};

export const formatPlanPrice = (
  price: string | number,
  currency: string,
  locale?: string,
) => {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return `${currency} ${price}`;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    // Intl rejects codes it does not know; fall back to a plain rendering.
    return `${currency} ${amount.toFixed(2)}`;
  }
};
