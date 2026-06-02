import { NextRequest, NextResponse } from "next/server";
import { encounterCatalogueSeed, publishedTemplateSeed } from "@/lib/catalogue/fightCatalogueSeed";
import { createCommonUsageBuildJob } from "@/lib/fflogs/commonUsageBuildJob";
import { rateLimitRequest, routeError } from "@/lib/fflogs/server";
import type { CommonUsageSampleFilter, ReportPerformanceBand } from "@/lib/common-usage/commonUsageTypes";
import type { TimelineEvent } from "@/types/planner";

function resolveEncounterMapping(encounterTemplateId?: string) {
  if (!encounterTemplateId) return undefined;
  const direct = encounterCatalogueSeed.find((item) => item.id === encounterTemplateId);
  if (direct) return direct;
  const template = publishedTemplateSeed.find((item) => item.id === encounterTemplateId);
  if (!template) return undefined;
  return encounterCatalogueSeed.find((item) => item.id === template.encounterCatalogueItemId);
}

export async function POST(request: NextRequest) {
  try {
    rateLimitRequest(request);
    const body = (await request.json()) as {
      encounterTemplateId: string;
      encounterName: string;
      fflogsZoneId?: number;
      gameZoneId?: number;
      fflogsEncounterId?: number;
      job?: string;
      role?: string;
      requestedSampleSize?: number;
      killOnly?: boolean;
      performanceBand?: ReportPerformanceBand;
      sampleFilter?: CommonUsageSampleFilter;
      includeHealingCooldowns?: boolean;
      includeSelfMitigation?: boolean;
      timelineEvents?: TimelineEvent[];
    };
    const mapping = resolveEncounterMapping(body.encounterTemplateId);
    const result = await createCommonUsageBuildJob({
      encounterTemplateId: body.encounterTemplateId,
      encounterName: body.encounterName,
      fflogsZoneId: body.fflogsZoneId ?? mapping?.fflogsZoneId,
      gameZoneId: body.gameZoneId,
      fflogsEncounterId: body.fflogsEncounterId ?? mapping?.fflogsEncounterId,
      job: body.job,
      role: body.role,
      requestedSampleSize: body.requestedSampleSize ?? 50,
      killOnly: body.killOnly ?? true,
      performanceBand: body.performanceBand ?? "any",
      sampleFilter: body.sampleFilter,
      mitigationOnly: true,
      includeHealingCooldowns: body.includeHealingCooldowns ?? true,
      includeSelfMitigation: body.includeSelfMitigation ?? true,
      timelineEvents: body.timelineEvents ?? []
    });
    return NextResponse.json(result);
  } catch (error) {
    return routeError(error);
  }
}
