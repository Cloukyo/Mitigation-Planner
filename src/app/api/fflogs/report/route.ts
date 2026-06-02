import { NextRequest, NextResponse } from "next/server";
import { parseReportUrl } from "@/lib/fflogs/parseReportUrl";
import { fetchFFLogsReport, rateLimitRequest, routeError } from "@/lib/fflogs/server";

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as { report?: string };
    const parsed = parseReportUrl(body.report ?? "");
    const report = await fetchFFLogsReport(parsed.reportCode);
    return NextResponse.json({ report, selectedFightId: parsed.fightId });
  } catch (error) {
    return routeError(error);
  }
}
