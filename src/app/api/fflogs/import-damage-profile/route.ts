import { NextRequest, NextResponse } from "next/server";
import { extractDamageProfile } from "@/lib/fflogs/extractDamageProfile";
import { parseReportUrl } from "@/lib/fflogs/parseReportUrl";
import { enrichEventsWithMasterData, fetchFFLogsEvents, fetchFFLogsFight, fetchMasterData, rateLimitRequest, routeError } from "@/lib/fflogs/server";

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as { report: string; fightId?: number };
    const parsed = parseReportUrl(body.report);
    const fightId = body.fightId ?? parsed.fightId;
    if (!fightId) throw new Error("Choose a fight before importing observed damage.");
    const { fight } = await fetchFFLogsFight(parsed.reportCode, fightId);
    const masterData = await fetchMasterData(parsed.reportCode);
    const events = enrichEventsWithMasterData(await fetchFFLogsEvents(parsed.reportCode, fight, "DamageDone"), masterData);
    const damageProfile = extractDamageProfile({ reportCode: parsed.reportCode, fightId, fightStartTime: fight.startTime, events });
    return NextResponse.json({ damageProfile });
  } catch (error) {
    return routeError(error);
  }
}
