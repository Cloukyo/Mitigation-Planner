import { fflogsGraphQL } from "@/lib/fflogs/client";
import { DISCOVER_REPORTS_QUERY } from "@/lib/fflogs/queries";
import type { ReportSampleCandidate } from "@/lib/common-usage/commonUsageTypes";

type DiscoverReportsResponse = {
  reportData: {
    reports?: {
      data?: Array<{
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
      }>;
      total?: number;
      current_page?: number;
      last_page?: number;
    };
  };
};

export async function discoverReports({
  fflogsZoneId,
  gameZoneId,
  fflogsEncounterId,
  limit = 20,
  page = 1,
  startTime,
  endTime
}: {
  fflogsZoneId?: number;
  gameZoneId?: number;
  fflogsEncounterId?: number;
  limit?: number;
  page?: number;
  startTime?: number;
  endTime?: number;
}): Promise<ReportSampleCandidate[]> {
  if (!fflogsZoneId && !gameZoneId) {
    throw new Error("This encounter does not have an FFLogs zone mapping yet. Try manual report URLs instead.");
  }

  const data = await fflogsGraphQL<DiscoverReportsResponse>(
    DISCOVER_REPORTS_QUERY,
    {
      zoneID: fflogsZoneId,
      gameZoneID: gameZoneId,
      startTime,
      endTime,
      limit,
      page
    },
    30 * 60_000
  );

  const reports = data.reportData.reports?.data ?? [];
  return reports.flatMap((report) =>
    (report.fights ?? [])
      .filter((fight) => !fflogsEncounterId || fight.encounterID === fflogsEncounterId)
      .map((fight) => ({
        reportCode: report.code,
        reportTitle: report.title,
        fightId: fight.id,
        encounterId: fight.encounterID,
        encounterName: fight.name,
        zoneId: fflogsZoneId ?? gameZoneId,
        startTime: fight.startTime,
        duration: Math.max(0, Math.round((fight.endTime - fight.startTime) / 1000)),
        kill: Boolean(fight.kill),
        percentage: fight.bossPercentage ?? fight.fightPercentage,
        sourceUrl: `https://www.fflogs.com/reports/${report.code}#fight=${fight.id}`,
        included: true
      }))
  );
}
