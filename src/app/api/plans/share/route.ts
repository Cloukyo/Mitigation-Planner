import { NextRequest, NextResponse } from "next/server";
import { updatePlanVisibility } from "@/lib/plans/planStorage";
import { shareUrlForSlug } from "@/lib/plans/shareLinks";
import { getUserFromBearerToken } from "@/lib/supabase/server";
import type { PlanVisibility } from "@/lib/plans/planTypes";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromBearerToken(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Sign in to update sharing." }, { status: 401 });
    const body = (await request.json()) as { planId?: string; shareSlug?: string; visibility?: PlanVisibility };
    if (!body.planId || !body.visibility) return NextResponse.json({ error: "Missing plan sharing details." }, { status: 400 });
    await updatePlanVisibility(body.planId, body.visibility, user.id);
    return NextResponse.json({ shareUrl: body.shareSlug ? shareUrlForSlug(body.shareSlug, request.nextUrl.origin) : undefined });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update sharing." }, { status: 400 });
  }
}
