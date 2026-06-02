import { NextRequest, NextResponse } from "next/server";
import { fflogsGraphQL, assertFFLogsRateLimit } from "@/lib/fflogs/client";
import { MASTER_DATA_QUERY, REPORT_EVENTS_QUERY, REPORT_FIGHTS_QUERY } from "@/lib/fflogs/queries";
import type { FFLogsEvent, FFLogsFightSummary, FFLogsReport } from "@/lib/fflogs/types";

type ReportDataResponse = {
  reportData: {
    report: {
      code: string;
      title?: string;
      startTime?: number;
      endTime?: number;
      fights?: Array<{
        id: number;
        encounterID?: number;
        name?: string;
        startTime: number;
        endTime: number;
        kill?: boolean;
        bossPercentage?: number;
        fightPercentage?: number;
        difficulty?: number;
      }>;
    };
  };
};

type EventDataResponse = {
  reportData: {
    report: {
      events?: {
        data?: FFLogsEvent[];
        nextPageTimestamp?: number | null;
      };
    };
  };
};

export function routeError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unknown FFLogs import error.";
  return NextResponse.json({ error: message }, { status });
}

export function rateLimitRequest(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  assertFFLogsRateLimit(ip);
}

export async function fetchFFLogsReport(code: string): Promise<FFLogsReport> {
  const data = await fflogsGraphQL<ReportDataResponse>(REPORT_FIGHTS_QUERY, { code });
  const report = data.reportData.report;
  const fights: FFLogsFightSummary[] = (report.fights ?? []).map((fight) => ({
    id: fight.id,
    encounterId: fight.encounterID,
    encounterName: fight.name,
    name: fight.name,
    startTime: fight.startTime,
    endTime: fight.endTime,
    kill: Boolean(fight.kill),
    percentage: fight.bossPercentage ?? fight.fightPercentage,
    difficulty: fight.difficulty,
    duration: Math.max(0, Math.round((fight.endTime - fight.startTime) / 1000))
  }));

  return {
    code: report.code ?? code,
    title: report.title,
    startTime: report.startTime,
    endTime: report.endTime,
    fights
  };
}

export async function fetchFFLogsEvents(code: string, fight: FFLogsFightSummary, dataType?: string, hostilityType: "Enemies" | "Friendlies" = "Enemies") {
  const data = await fflogsGraphQL<EventDataResponse>(
    REPORT_EVENTS_QUERY,
    {
      code,
      startTime: fight.startTime,
      endTime: fight.endTime,
      dataType,
      hostilityType,
      limit: 10_000
    },
    10 * 60_000
  );
  return data.reportData.report.events?.data ?? [];
}

export async function fetchFFLogsFight(code: string, fightId: number) {
  const report = await fetchFFLogsReport(code);
  const fight = report.fights.find((item) => item.id === fightId);
  if (!fight) throw new Error(`Fight ${fightId} was not found in report ${code}.`);
  return { report, fight };
}

export async function fetchMasterData(code: string) {
  return fflogsGraphQL(MASTER_DATA_QUERY, { code }, 30 * 60_000);
}

export function enrichEventsWithMasterData(events: FFLogsEvent[], masterData: unknown): FFLogsEvent[] {
  const data = masterData as {
    reportData?: {
      report?: {
        masterData?: {
          actors?: Array<{ id: number; name?: string; type?: string; subType?: string }>;
          abilities?: Array<{ gameID: number; name?: string; type?: number }>;
        };
      };
    };
  };
  const actors = new Map((data.reportData?.report?.masterData?.actors ?? []).map((actor) => [actor.id, actor]));
  const abilities = new Map((data.reportData?.report?.masterData?.abilities ?? []).map((ability) => [ability.gameID, ability]));

  return events.map((event) => {
    const abilityGameId = event.abilityGameID ?? event.ability?.gameID;
    const ability = abilityGameId ? abilities.get(abilityGameId) : undefined;
    const source = event.source ?? (event.sourceID ? actors.get(event.sourceID) : undefined);
    const target = event.target ?? (event.targetID ? actors.get(event.targetID) : undefined);
    return {
      ...event,
      source,
      target,
      ability: ability ? { gameID: ability.gameID, name: ability.name, type: ability.type } : event.ability,
      abilityName: event.abilityName ?? ability?.name ?? event.ability?.name
    };
  });
}
