import { NextRequest, NextResponse } from "next/server";
import { runCommonUsageBuildJobBatch } from "@/lib/fflogs/commonUsageBuildJob";
import { rateLimitRequest, routeError } from "@/lib/fflogs/server";

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as { jobId?: string; batchSize?: number };
    if (!body.jobId) throw new Error("Missing common usage build job id.");
    return NextResponse.json(await runCommonUsageBuildJobBatch(body.jobId, body.batchSize ?? 3));
  } catch (error) {
    return routeError(error);
  }
}
