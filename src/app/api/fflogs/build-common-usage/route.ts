import { NextRequest, NextResponse } from "next/server";
import { aggregateCommonUsage } from "@/lib/fflogs/aggregateCommonUsage";
import { extractActionTimeline } from "@/lib/fflogs/extractActionTimeline";
import { enrichEventsWithMasterData, fetchFFLogsEvents, fetchFFLogsFight, fetchMasterData, rateLimitRequest, routeError } from "@/lib/fflogs/server";
import type { CommonUsageBuildRequest, ReportSampleCandidate } from "@/lib/common-usage/commonUsageTypes";
import type { TimelineEvent } from "@/types/planner";

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as CommonUsageBuildRequest & {
      encounterName?: string;
      samples: ReportSampleCandidate[];
      timelineEvents?: TimelineEvent[];
      includeHealingCooldowns?: boolean;
      includeSelfMitigation?: boolean;
    };
    const selected = (body.samples ?? []).filter((sample) => sample.included && sample.reportCode && sample.fightId).slice(0, Math.min(body.sampleSize, 20));
    if (!selected.length) throw new Error("No report samples were selected for common usage build.");

    const usageGroups = await Promise.all(
      selected.map(async (sample) => {
        const { fight } = await fetchFFLogsFight(sample.reportCode, sample.fightId!);
        const masterData = await fetchMasterData(sample.reportCode);
        const castEvents = enrichEventsWithMasterData(await fetchFFLogsEvents(sample.reportCode, fight, "Casts", "Friendlies"), masterData);
        return extractActionTimeline({
          reportCode: sample.reportCode,
          fightId: sample.fightId!,
          fightStartTime: fight.startTime,
          encounterTemplateId: body.encounterTemplateId,
          events: castEvents,
          timelineEvents: body.timelineEvents ?? [],
          options: {
            job: body.job,
            role: body.role,
            mitigationOnly: body.mitigationOnly,
            includeHealingCooldowns: body.includeHealingCooldowns ?? true,
            includeSelfMitigation: body.includeSelfMitigation ?? true
          }
        });
      })
    );
    const usages = usageGroups.flat();
    const timings = aggregateCommonUsage(usages, body.encounterTemplateId, selected.length);
    const now = new Date().toISOString();
    return NextResponse.json({
      entry: {
        id: `common-library-${body.encounterTemplateId}-${body.job ?? body.role ?? "all"}-${body.performanceBand}-${Date.now()}`,
        encounterTemplateId: body.encounterTemplateId,
        encounterName: body.encounterName ?? body.encounterTemplateId,
        job: body.job,
        role: body.role,
        source: "fflogs_public_sample",
        performanceBand: body.performanceBand,
        sampleFilter: body.sampleFilter,
        requestedSampleSize: body.sampleSize,
        actualSampleSize: selected.length,
        processedReportCount: new Set(selected.map((sample) => sample.reportCode)).size,
        processedFightCount: selected.length,
        generatedBy: "live_sample",
        cacheVersion: "live-v1",
        sampleSize: body.sampleSize,
        reportCount: new Set(selected.map((sample) => sample.reportCode)).size,
        fightCount: selected.length,
        status: "draft",
        timings,
        sourceReports: selected,
        createdAt: now,
        updatedAt: now,
        notes: "Common usage is aggregated from public/user-provided FFLogs samples. It may reflect speedkill, reclear, or group-specific strategies and may not be ideal for progression."
      }
    });
  } catch (error) {
    return routeError(error);
  }
}
