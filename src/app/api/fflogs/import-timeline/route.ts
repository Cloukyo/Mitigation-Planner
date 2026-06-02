import { NextRequest, NextResponse } from "next/server";
import { extractBossTimeline } from "@/lib/fflogs/extractBossTimeline";
import { extractDamageProfile } from "@/lib/fflogs/extractDamageProfile";
import { parseReportUrl } from "@/lib/fflogs/parseReportUrl";
import { enrichEventsWithMasterData, fetchFFLogsEvents, fetchFFLogsFight, fetchMasterData, rateLimitRequest, routeError } from "@/lib/fflogs/server";

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as { report: string; fightId?: number; includeDamage?: boolean };
    const parsed = parseReportUrl(body.report);
    const fightId = body.fightId ?? parsed.fightId;
    if (!fightId) throw new Error("Choose a fight before importing a timeline.");
    const { report, fight } = await fetchFFLogsFight(parsed.reportCode, fightId);
    const masterData = await fetchMasterData(parsed.reportCode);
    const castEvents = enrichEventsWithMasterData(await fetchFFLogsEvents(parsed.reportCode, fight, "Casts"), masterData);
    const damageEvents = body.includeDamage ? enrichEventsWithMasterData(await fetchFFLogsEvents(parsed.reportCode, fight, "DamageDone"), masterData) : [];
    const damageProfile = body.includeDamage
      ? extractDamageProfile({ reportCode: parsed.reportCode, fightId, fightStartTime: fight.startTime, events: damageEvents })
      : [];
    const candidates = extractBossTimeline({
      reportCode: parsed.reportCode,
      fightId,
      fightStartTime: fight.startTime,
      events: [...castEvents, ...damageEvents],
      damageProfile
    });

    return NextResponse.json({
      report,
      fight,
      candidates,
      damageProfile,
      warning: "Observed damage may already include mitigation, shields, gear differences, vuln stacks, deaths, and party-specific conditions."
    });
  } catch (error) {
    return routeError(error);
  }
}
