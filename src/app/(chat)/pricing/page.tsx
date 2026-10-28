import { PricingPlans } from "@/components/plans/pricing-plans";
import { getSession } from "auth/server";
import { getPricingPageData } from "lib/plan/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [data, { checkout }] = await Promise.all([
    getPricingPageData(session.user.id),
    searchParams,
  ]);

  return <PricingPlans {...data} checkoutSuccess={checkout === "success"} />;
}
