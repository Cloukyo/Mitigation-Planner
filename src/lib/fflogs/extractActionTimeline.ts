import jobs from "@/data/jobs/jobs.json";
import { matchActionToAbility, isMitigationPlanningAbility } from "@/lib/fflogs/matchActionToAbility";
import { matchActionToTimelineEvent } from "@/lib/fflogs/matchActionToTimelineEvent";
import { formatTime } from "@/lib/time";
import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import type { FFLogsEvent } from "@/lib/fflogs/types";
import type { TimelineEvent } from "@/types/planner";

const jobRows = jobs as Array<{ abbr: string; name: string; role: string }>;
const jobByName = new Map(jobRows.map((job) => [job.name.toLowerCase(), job]));
const jobByAbbr = new Map(jobRows.map((job) => [job.abbr.toLowerCase(), job]));
const acceptedEventTypes = new Set(["cast", "applybuff", "applydebuff"]);

function normalizeEventType(type?: string): ExternalActionUsage["eventType"] {
  const normalized = type?.toLowerCase() ?? "unknown";
  if (normalized === "begincast" || normalized === "cast") return "cast";
  if (normalized === "applybuff") return "applybuff";
  if (normalized === "applydebuff") return "applydebuff";
  if (normalized === "removebuff") return "removebuff";
  if (normalized === "removedebuff") return "removedebuff";
  if (normalized === "heal") return "heal";
  if (normalized === "damage") return "damage";
  return "unknown";
}

export function extractActionTimeline({
  reportCode,
  fightId,
  fightStartTime,
  encounterTemplateId,
  events,
  timelineEvents = [],
  options
}: {
  reportCode: string;
  fightId: number;
  fightStartTime: number;
  encounterTemplateId: string;
  events: FFLogsEvent[];
  timelineEvents?: TimelineEvent[];
  options?: {
    job?: string;
    role?: string;
    mitigationOnly?: boolean;
    includeHealingCooldowns?: boolean;
    includeSelfMitigation?: boolean;
    showUnmatched?: boolean;
  };
}): ExternalActionUsage[] {
  const dedupe = new Set<string>();
  const rows: Array<ExternalActionUsage | null> = events
    .map((event, index) => {
      const eventType = normalizeEventType(event.type);
      if (!acceptedEventTypes.has(eventType)) return null;
      if (event.sourceIsFriendly === false || event.source?.type === "NPC") return null;
      const abilityName = event.abilityName ?? event.ability?.name;
      if (!abilityName || abilityName.toLowerCase().includes("attack")) return null;
      const abilityGameId = event.abilityGameID ?? event.ability?.gameID;
      const ability = matchActionToAbility({ abilityName, abilityGameId });
      if (!ability && !options?.showUnmatched) return null;
      if (options?.mitigationOnly && !isMitigationPlanningAbility(ability, options)) return null;

      const sourceJob = jobByName.get(event.source?.subType?.toLowerCase() ?? "") ?? jobByAbbr.get(event.source?.subType?.toLowerCase() ?? "");
      if (options?.job && sourceJob?.abbr !== options.job) return null;
      if (options?.role && sourceJob?.role !== options.role) return null;

      const timestamp = Math.max(0, Math.round((event.timestamp - fightStartTime) / 1000));
      const dedupeKey = `${event.sourceID ?? "actor"}:${ability?.id ?? abilityGameId ?? abilityName}:${Math.round(timestamp / 2)}`;
      if (dedupe.has(dedupeKey)) return null;
      dedupe.add(dedupeKey);
      const timelineMatch = matchActionToTimelineEvent({ timestamp }, timelineEvents);

      const usage: ExternalActionUsage = {
        id: `fflogs-action-${reportCode}-${fightId}-${index}-${timestamp}`,
        sourceId: `source-${reportCode}-${fightId}`,
        source: "fflogs" as const,
        reportCode,
        fightId,
        encounterTemplateId,
        actorName: event.source?.name,
        actorId: event.sourceID,
        sourceJob: sourceJob?.abbr,
        sourceRole: sourceJob?.role,
        abilityGameId: ability?.actionId ?? abilityGameId,
        abilityName: ability?.name ?? abilityName,
        abilityId: ability?.id,
        timestamp,
        displayTime: formatTime(timestamp),
        eventType,
        confidence: ability ? ("high" as const) : ("low" as const),
        importStatus: "pending" as const,
        notes: ability ? undefined : "Unmatched action from FFLogs.",
        ...timelineMatch
      };
      return usage;
    })
  return rows.filter((usage): usage is ExternalActionUsage => usage !== null).sort((a, b) => a.timestamp - b.timestamp);
}
