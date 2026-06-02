import { matchActionToAbility } from "@/lib/fflogs/matchActionToAbility";
import { matchActionToTimelineEvent } from "@/lib/fflogs/matchActionToTimelineEvent";
import { formatTime } from "@/lib/time";
import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import type { TimelineEvent } from "@/types/planner";

type SeedUsage = {
  encounterTemplateId: string;
  sourceJob: string;
  sourceRole: string;
  abilityName: string;
  timestamp: number;
  confidence: ExternalActionUsage["confidence"];
  notes?: string;
};

const seedCommonUsageRows: SeedUsage[] = [
  {
    encounterTemplateId: "fru",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Sacred Soil",
    timestamp: 14,
    confidence: "medium",
    notes: "Local starter reference timing. Review against your group's strategy."
  },
  {
    encounterTemplateId: "fru",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Expedient",
    timestamp: 42,
    confidence: "medium",
    notes: "Local starter reference timing. Review against your group's strategy."
  },
  {
    encounterTemplateId: "fru",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Deployment Tactics",
    timestamp: 72,
    confidence: "medium",
    notes: "Local starter reference timing. Review against your group's strategy."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Sacred Soil",
    timestamp: 12,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Protraction",
    timestamp: 58,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Expedient",
    timestamp: 70,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Recitation",
    timestamp: 112,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Fey Illumination",
    timestamp: 150,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Summon Seraph",
    timestamp: 214,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Consolation",
    timestamp: 222,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Sacred Soil",
    timestamp: 276,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Deployment Tactics",
    timestamp: 325,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Sacred Soil",
    timestamp: 405,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Recitation",
    timestamp: 480,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Expedient",
    timestamp: 548,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Sacred Soil",
    timestamp: 650,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Fey Illumination",
    timestamp: 776,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Sacred Soil",
    timestamp: 895,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Seraphism",
    timestamp: 945,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Expedient",
    timestamp: 1010,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Summon Seraph",
    timestamp: 1085,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Consolation",
    timestamp: 1094,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  },
  {
    encounterTemplateId: "top",
    sourceJob: "SCH",
    sourceRole: "healer",
    abilityName: "Sacred Soil",
    timestamp: 1208,
    confidence: "low",
    notes: "TOP starter reference only. Replace with FFLogs-derived common usage for real planning."
  }
];

export function getSeedCommonUsage({
  encounterTemplateId,
  sourceId,
  job,
  role,
  timelineEvents
}: {
  encounterTemplateId: string;
  sourceId: string;
  job?: string;
  role?: string;
  timelineEvents: TimelineEvent[];
}): ExternalActionUsage[] {
  return seedCommonUsageRows
    .filter((row) => row.encounterTemplateId === encounterTemplateId)
    .filter((row) => !job || row.sourceJob === job)
    .filter((row) => !role || row.sourceRole === role)
    .map((row, index) => {
      const ability = matchActionToAbility({ abilityName: row.abilityName });
      return {
        id: `seed-common-${sourceId}-${index}`,
        sourceId,
        source: "manual",
        encounterTemplateId,
        sourceJob: row.sourceJob,
        sourceRole: row.sourceRole,
        abilityGameId: ability?.actionId ?? undefined,
        abilityName: ability?.name ?? row.abilityName,
        abilityId: ability?.id,
        timestamp: row.timestamp,
        displayTime: formatTime(row.timestamp),
        eventType: "unknown",
        confidence: row.confidence,
        importStatus: "pending",
        notes: row.notes,
        ...matchActionToTimelineEvent({ timestamp: row.timestamp }, timelineEvents)
      };
    });
}
