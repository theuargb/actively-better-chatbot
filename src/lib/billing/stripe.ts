// No "server-only": auth-instance.ts is also loaded by seed scripts.
import type { StripePlan } from "@better-auth/stripe";
import { planRepository } from "lib/db/repository";
import { fromStripeAmount, getPlanCurrency } from "lib/plan/currency";
import Stripe from "stripe";

export const isBillingEnabled = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe | null => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

/**
 * The Stripe plugin matches a subscription to a plan by price id and stores the
 * plan `name`; we use the plan code as that name. Archived plans stay in the list
 * so webhooks still resolve the people already subscribed to them.
 */
export const getStripePlans = async (): Promise<StripePlan[]> =>
  (await planRepository.list(true)).flatMap((plan) =>
    plan.stripePriceId
      ? [
          {
            name: plan.code,
            priceId: plan.stripePriceId,
            annualDiscountPriceId: plan.stripeAnnualPriceId ?? undefined,
          },
        ]
      : [],
  );

/** Stops billing for a user who is deleting their account. */
export const cancelStripeSubscriptionsForUser = async (userId: string) => {
  const stripe = getStripeClient();
  if (!stripe) return;
  for (const id of await planRepository.listActiveSubscriptionIds(userId)) {
    await stripe.subscriptions.cancel(id);
  }
};

/**
 * Reads a price from Stripe and returns its amount in the app currency, so the
 * stored plan price can never drift from what Checkout charges. Throws with a
 * message an admin can act on.
 */
export const resolveStripePrice = async (
  priceId: string,
  interval: "month" | "year",
): Promise<string> => {
  const stripe = getStripeClient();
  if (!stripe) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY)");

  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    throw new Error(`Stripe price ${priceId} was not found`);
  }
  if (!price.active) throw new Error(`Stripe price ${priceId} is not active`);
  if (price.recurring?.interval !== interval) {
    throw new Error(
      `Stripe price ${priceId} must recur every ${interval}${
        price.recurring ? ` (it recurs every ${price.recurring.interval})` : ""
      }`,
    );
  }
  const currency = getPlanCurrency();
  if (price.currency.toUpperCase() !== currency) {
    throw new Error(
      `Stripe price ${priceId} is in ${price.currency.toUpperCase()}, but PLAN_CURRENCY is ${currency}`,
    );
  }
  if (price.unit_amount === null) {
    throw new Error(`Stripe price ${priceId} has no fixed amount`);
  }
  return fromStripeAmount(price.unit_amount, price.currency).toFixed(2);
};
