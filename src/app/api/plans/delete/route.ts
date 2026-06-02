import { NextRequest, NextResponse } from "next/server";
import { deleteUserPlan } from "@/lib/plans/planStorage";
import { getUserFromBearerToken } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromBearerToken(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Sign in to delete plans." }, { status: 401 });
    const body = (await request.json()) as { planId?: string };
    if (!body.planId) return NextResponse.json({ error: "Missing plan id." }, { status: 400 });
    await deleteUserPlan(body.planId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete plan." }, { status: 400 });
  }
}
