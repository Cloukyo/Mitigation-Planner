import { NextRequest, NextResponse } from "next/server";
import { aggregateCommonUsage } from "@/lib/fflogs/aggregateCommonUsage";
import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { usages: ExternalActionUsage[]; encounterTemplateId: string; sampleSize?: number };
  return NextResponse.json({
    timings: aggregateCommonUsage(body.usages ?? [], body.encounterTemplateId, body.sampleSize ?? 1)
  });
}
