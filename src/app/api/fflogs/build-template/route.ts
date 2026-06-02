import { NextRequest, NextResponse } from "next/server";
import { formatTime } from "@/lib/time";
import { parseReportUrl } from "@/lib/fflogs/parseReportUrl";
import { rateLimitRequest, routeError } from "@/lib/fflogs/server";
import type { EncounterTemplate } from "@/lib/catalogue/catalogueTypes";
import type { BossTimelineEventCandidate, SourceReportSummary } from "@/lib/fflogs/types";
import type { TimelineEvent } from "@/types/planner";

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as {
      report: string;
      fightId: number;
      fightName?: string;
      encounterName?: string;
      encounterCatalogueItemId?: string;
      candidates: BossTimelineEventCandidate[];
      selectedIds?: string[];
    };
    const parsed = parseReportUrl(body.report);
    const selected = new Set(body.selectedIds ?? body.candidates.map((candidate) => candidate.id));
    const events: TimelineEvent[] = body.candidates
      .filter((candidate) => selected.has(candidate.id))
      .map((candidate) => ({
        id: `fflogs-${candidate.id}`,
        time: candidate.relativeTime,
        displayTime: formatTime(candidate.relativeTime),
        name: candidate.abilityName,
        abilityGameId: candidate.abilityGameId,
        damageType: candidate.damageType,
        targetType: candidate.targetType,
        severity: candidate.severity ?? "unknown",
        mitigationRelevant: candidate.mitigationRelevant,
        observedDamage: candidate.observedDamage,
        notes: candidate.notes,
        source: "fflogs"
      }));
    const sourceReports: SourceReportSummary[] = [
      {
        reportCode: parsed.reportCode,
        fightId: body.fightId,
        fightName: body.fightName,
        encounterName: body.encounterName,
        kill: false,
        duration: Math.max(0, ...events.map((event) => event.time)),
        sourceUrl: `https://www.fflogs.com/reports/${parsed.reportCode}#fight=${body.fightId}`
      }
    ];
    const now = new Date().toISOString();
    const template: EncounterTemplate = {
      id: `template-${parsed.reportCode}-${body.fightId}-${Date.now()}`,
      encounterCatalogueItemId: body.encounterCatalogueItemId ?? `fflogs-${parsed.reportCode}-${body.fightId}`,
      name: body.encounterName || body.fightName || `FFLogs ${parsed.reportCode} fight ${body.fightId}`,
      shortName: body.encounterName,
      source: "fflogs_curated_reports",
      status: "draft",
      events,
      sourceReports,
      sourceLinks: sourceReports.map((report) => ({ label: `${report.reportCode} fight ${report.fightId}`, url: report.sourceUrl ?? "", type: "fflogs" as const })).filter((link) => link.url),
      notes: "Timeline and observed damage are log-derived and may need review.",
      createdAt: now,
      updatedAt: now
    };
    return NextResponse.json({ template });
  } catch (error) {
    return routeError(error);
  }
}
