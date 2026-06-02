import { NextRequest, NextResponse } from "next/server";
import { encounterCatalogueSeed, publishedTemplateSeed } from "@/lib/catalogue/fightCatalogueSeed";
import { discoverReports } from "@/lib/fflogs/discoverReports";
import { selectReportSamples } from "@/lib/fflogs/selectReportSamples";
import { rateLimitRequest, routeError } from "@/lib/fflogs/server";
import type { ReportPerformanceBand, ReportSampleCandidate } from "@/lib/common-usage/commonUsageTypes";

function resolveEncounterMapping(encounterTemplateId?: string) {
  if (!encounterTemplateId) return undefined;
  const direct = encounterCatalogueSeed.find((item) => item.id === encounterTemplateId);
  if (direct) return direct;
  const template = publishedTemplateSeed.find((item) => item.id === encounterTemplateId);
  if (!template) return undefined;
  return encounterCatalogueSeed.find((item) => item.id === template.encounterCatalogueItemId);
}

function sampleFilterForBand(band: ReportPerformanceBand) {
  if (band === "top_25") return "top25";
  if (band === "median") return "median";
  return "any";
}

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as {
      encounterTemplateId?: string;
      fflogsZoneId?: number;
      gameZoneId?: number;
      fflogsEncounterId?: number;
      sampleSize?: number;
      killOnly?: boolean;
      performanceBand?: ReportPerformanceBand;
      sampleFilter?: "any" | "top25" | "median";
      startTime?: number;
      endTime?: number;
    };
    const performanceBand = body.performanceBand ?? (body.sampleFilter === "top25" ? "top_25" : body.sampleFilter === "median" ? "median" : "any");
    const mapping = resolveEncounterMapping(body.encounterTemplateId);
    const sampleSize = Math.min(Math.max(body.sampleSize ?? 10, 5), 20);
    const candidates: ReportSampleCandidate[] = [];
    let selected: ReportSampleCandidate[] = [];
    const seen = new Set<string>();
    // FFLogs applies a GraphQL complexity cap per request. Including fights on
    // report discovery gets expensive quickly, so keep each page modest and
    // collect additional candidates across more pages instead.
    const pageSize = Math.min(40, Math.max(10, sampleSize * 2));
    const maxPages = 8;
    for (let page = 1; page <= maxPages; page += 1) {
      const pageCandidates = await discoverReports({
        fflogsZoneId: body.fflogsZoneId ?? mapping?.fflogsZoneId,
        gameZoneId: body.gameZoneId,
        fflogsEncounterId: body.fflogsEncounterId ?? mapping?.fflogsEncounterId,
        limit: pageSize,
        page,
        startTime: body.startTime,
        endTime: body.endTime
      });
      for (const candidate of pageCandidates) {
        const key = `${candidate.reportCode}:${candidate.fightId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(candidate);
      }
      selected = selectReportSamples({
        candidates,
        sampleSize,
        killOnly: body.killOnly ?? true,
        performanceBand
      });
      if (selected.length >= sampleSize || pageCandidates.length === 0) break;
    }
    const hasPercentileMetadata = candidates.some((candidate) => candidate.parsePercentile != null || candidate.percentile != null);
    const effectivePerformanceBand = performanceBand !== "any" && !hasPercentileMetadata ? "any" : performanceBand;
    return NextResponse.json({
      candidates,
      selected,
      performanceBand,
      effectivePerformanceBand,
      sampleFilter: performanceBand !== "any" && !hasPercentileMetadata ? "unavailable" : sampleFilterForBand(effectivePerformanceBand),
      warning:
        performanceBand !== "any" && !hasPercentileMetadata
          ? "FFLogs percentile filtering is not available from the current API response, so this sample uses public kill logs rather than top/median parse bands."
          : selected.length
            ? "Review the selected public kill samples before building; FFLogs public discovery may not expose parse percentile metadata for every report."
            : "No public kill samples matched the current filters. Try neutral sampling, a different sample size, or manual report URLs."
    });
  } catch (error) {
    return routeError(error);
  }
}
