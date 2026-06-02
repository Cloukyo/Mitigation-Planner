import { NextRequest, NextResponse } from "next/server";
import { duplicatePlanFromShareSlug } from "@/lib/plans/planStorage";
import { getUserFromBearerToken } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromBearerToken(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Sign in to duplicate plans." }, { status: 401 });
    const body = (await request.json()) as { shareSlug?: string };
    if (!body.shareSlug) return NextResponse.json({ error: "Missing share link slug." }, { status: 400 });
    return NextResponse.json(await duplicatePlanFromShareSlug(body.shareSlug, user.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not duplicate plan." }, { status: 400 });
  }
}
