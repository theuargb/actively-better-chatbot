import { authClient } from "auth/client";

/**
 * Sends the user to Stripe for `planCode`. Users with a subscription go to the
 * portal's switch flow instead (better-auth finds it by user), which comes back
 * to `returnPath`. Resolves to false when the redirect could not be started.
 */
export async function startPlanCheckout(
  planCode: string,
  returnPath: string,
): Promise<boolean> {
  const { error } = await authClient.subscription.upgrade({
    plan: planCode,
    successUrl: "/pricing?checkout=success",
    cancelUrl: returnPath,
    returnUrl: returnPath,
  });
  return !error;
}
