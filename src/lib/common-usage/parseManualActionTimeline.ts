import jobs from "@/data/jobs/jobs.json";
import { matchActionToAbility, normalizeActionName } from "@/lib/fflogs/matchActionToAbility";
import { matchActionToTimelineEvent } from "@/lib/fflogs/matchActionToTimelineEvent";
import { formatTime, parseTime } from "@/lib/time";
import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import type { TimelineEvent } from "@/types/planner";

const jobRows = jobs as Array<{ abbr: string; name: string; role: string }>;
const jobByToken = new Map<string, { abbr: string; name: string; role: string }>();
jobRows.forEach((job) => {
  jobByToken.set(normalizeActionName(job.abbr), job);
  jobByToken.set(normalizeActionName(job.name), job);
});

function splitRow(row: string) {
  if (row.includes("|")) return row.split("|").map((part) => part.trim()).filter(Boolean);
  if (row.includes("\t")) return row.split("\t").map((part) => part.trim()).filter(Boolean);
  return row.trim().split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
}

export function parseManualActionTimeline({
  text,
  sourceId,
  encounterTemplateId,
  timelineEvents = [],
  keepUnmatched = true
}: {
  text: string;
  sourceId: string;
  encounterTemplateId: string;
  timelineEvents?: TimelineEvent[];
  keepUnmatched?: boolean;
}): ExternalActionUsage[] {
  const rows: Array<ExternalActionUsage | null> = text
    .split(/\r?\n/)
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const parts = splitRow(trimmed);
      const time = parseTime(parts[0] ?? "");
      if (time == null) return null;

      const tokens = parts.slice(1);
      const jobIndex = tokens.findIndex((token) => jobByToken.has(normalizeActionName(token)));
      const job = jobIndex >= 0 ? jobByToken.get(normalizeActionName(tokens[jobIndex])) : undefined;
      const remaining = tokens.filter((_, tokenIndex) => tokenIndex !== jobIndex);
      const abilityName = remaining.at(-1) ?? tokens.at(-1) ?? "Unknown Action";
      const actorName = remaining.length > 1 ? remaining.slice(0, -1).join(" ") : undefined;
      const ability = matchActionToAbility({ abilityName });
      if (!ability && !keepUnmatched) return null;
      const timelineMatch = matchActionToTimelineEvent({ timestamp: time }, timelineEvents);

      const usage: ExternalActionUsage = {
        id: `manual-${sourceId}-${index}-${Math.round(time)}`,
        sourceId,
        source: "manual" as const,
        encounterTemplateId,
        actorName,
        sourceJob: job?.abbr,
        sourceRole: job?.role,
        abilityName,
        abilityId: ability?.id,
        abilityGameId: ability?.actionId ?? undefined,
        timestamp: time,
        displayTime: formatTime(time),
        eventType: "unknown" as const,
        confidence: ability ? ("medium" as const) : ("low" as const),
        importStatus: "pending" as const,
        notes: ability ? undefined : "Unmatched pasted row. Keep as reference or exclude before import.",
        ...timelineMatch
      };
      return usage;
    });
  return rows.filter((usage): usage is ExternalActionUsage => usage !== null);
}
