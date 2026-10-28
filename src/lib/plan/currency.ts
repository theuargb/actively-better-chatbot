export const ISO_4217 = /^[A-Z]{3}$/;

/** Currency of plans without a Stripe price (and the column default). */
export const DEFAULT_PLAN_CURRENCY = "USD";

/**
 * Whole amounts drop the decimals ("$10", not "$10.00") and the symbol is the
 * narrow form ("$", "₴"), so prices stay short enough for a pricing card.
 */
export const formatPlanPrice = (
  price: string | number,
  currency: string,
  locale?: string,
) => {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return `${currency} ${price}`;
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    // Intl rejects codes it does not know; fall back to a plain rendering.
    return `${currency} ${amount.toFixed(fractionDigits)}`;
  }
};

// Stripe amounts are in the smallest currency unit; these currencies have none.
// https://docs.stripe.com/currencies#zero-decimal
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export const fromStripeAmount = (unitAmount: number, currency: string) =>
  ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
    ? unitAmount
    : unitAmount / 100;
