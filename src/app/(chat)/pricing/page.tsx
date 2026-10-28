import { PricingPlans } from "@/components/plans/pricing-plans";
import { getSession } from "auth/server";
import { getPricingPageData } from "lib/plan/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const data = await getPricingPageData(session.user.id);

  return <PricingPlans {...data} />;
}
