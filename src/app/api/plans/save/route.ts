import { NextRequest, NextResponse } from "next/server";
import { savePlanSnapshot } from "@/lib/plans/planStorage";
import { getUserFromBearerToken } from "@/lib/supabase/server";
import type { PlanSnapshot } from "@/lib/plans/planTypes";

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromBearerToken(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Sign in to save and share plans." }, { status: 401 });
    const body = (await request.json()) as { snapshot?: PlanSnapshot };
    if (!body.snapshot) return NextResponse.json({ error: "Missing plan snapshot." }, { status: 400 });
    return NextResponse.json(await savePlanSnapshot({ snapshot: body.snapshot, userId: user.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save plan." }, { status: 400 });
  }
}
