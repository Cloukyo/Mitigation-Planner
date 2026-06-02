import { NextRequest, NextResponse } from "next/server";
import { listUserPlans } from "@/lib/plans/planStorage";
import { getUserFromBearerToken } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromBearerToken(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Sign in to view saved plans." }, { status: 401 });
    return NextResponse.json({ plans: await listUserPlans(user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load plans." }, { status: 400 });
  }
}
