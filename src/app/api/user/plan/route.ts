import { getSession } from "auth/server";
import { getUserPlanSummary } from "lib/plan/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(await getUserPlanSummary(session.user.id));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get user plan",
      },
      { status: 500 },
    );
  }
}
