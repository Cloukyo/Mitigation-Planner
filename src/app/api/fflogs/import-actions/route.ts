import { NextRequest, NextResponse } from "next/server";
import { extractActionTimeline } from "@/lib/fflogs/extractActionTimeline";
import { parseReportUrl } from "@/lib/fflogs/parseReportUrl";
import { enrichEventsWithMasterData, fetchFFLogsEvents, fetchFFLogsFight, fetchMasterData, rateLimitRequest, routeError } from "@/lib/fflogs/server";
import type { TimelineEvent } from "@/types/planner";

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as {
      report: string;
      fightId?: number;
      encounterTemplateId?: string;
      timelineEvents?: TimelineEvent[];
      job?: string;
      role?: string;
      mitigationOnly?: boolean;
      includeHealingCooldowns?: boolean;
      includeSelfMitigation?: boolean;
      showUnmatched?: boolean;
    };
    const parsed = parseReportUrl(body.report);
    const fightId = body.fightId ?? parsed.fightId;
    if (!fightId) throw new Error("Choose a fight before importing common usage.");
    const { report, fight } = await fetchFFLogsFight(parsed.reportCode, fightId);
    const masterData = await fetchMasterData(parsed.reportCode);
    const castEvents = enrichEventsWithMasterData(await fetchFFLogsEvents(parsed.reportCode, fight, "Casts", "Friendlies"), masterData);
    const usages = extractActionTimeline({
      reportCode: parsed.reportCode,
      fightId,
      fightStartTime: fight.startTime,
      encounterTemplateId: body.encounterTemplateId ?? fight.encounterName ?? "custom",
      events: castEvents,
      timelineEvents: body.timelineEvents ?? [],
      options: {
        job: body.job,
        role: body.role,
        mitigationOnly: body.mitigationOnly ?? true,
        includeHealingCooldowns: body.includeHealingCooldowns,
        includeSelfMitigation: body.includeSelfMitigation,
        showUnmatched: body.showUnmatched
      }
    });

    return NextResponse.json({ report, fight, usages });
  } catch (error) {
    return routeError(error);
  }
}
