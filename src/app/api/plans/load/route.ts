import { NextRequest, NextResponse } from "next/server";
import { loadPlanByShareSlug } from "@/lib/plans/planStorage";
import { getUserFromBearerToken } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromBearerToken(request.headers.get("authorization"));
    const body = (await request.json()) as { shareSlug?: string };
    if (!body.shareSlug) return NextResponse.json({ error: "Missing share link slug." }, { status: 400 });
    const loaded = await loadPlanByShareSlug(body.shareSlug, user?.id);
    if (!loaded) return NextResponse.json({ error: "Plan not found or access denied." }, { status: 404 });
    return NextResponse.json(loaded);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load plan." }, { status: 400 });
  }
}
