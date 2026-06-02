import { NextRequest, NextResponse } from "next/server";
import { getCommonUsageBuildJob } from "@/lib/fflogs/commonUsageBuildJob";
import { routeError } from "@/lib/fflogs/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { jobId?: string };
    if (!body.jobId) throw new Error("Missing common usage build job id.");
    return NextResponse.json(await getCommonUsageBuildJob(body.jobId));
  } catch (error) {
    return routeError(error);
  }
}
