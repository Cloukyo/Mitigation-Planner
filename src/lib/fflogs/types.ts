import type { DamageType, EventTarget, Severity, TimelineEvent } from "@/types/planner";

export type FFLogsFightSummary = {
  id: number;
  encounterId?: number;
  encounterName?: string;
  name?: string;
  startTime: number;
  endTime: number;
  kill: boolean;
  percentage?: number;
  difficulty?: number;
  duration: number;
};

export type FFLogsReport = {
  code: string;
  title?: string;
  owner?: string;
  startTime?: number;
  endTime?: number;
  fights: FFLogsFightSummary[];
};

export type EncounterCatalogueItem = {
  id: string;
  source: "fflogs" | "manual" | "xivapi";
  fflogsEncounterId?: number;
  fflogsZoneId?: number;
  name: string;
  zoneName?: string;
  expansion?: string;
  difficulty?: string;
  type: "ultimate" | "savage" | "extreme" | "normal" | "criterion" | "unknown";
  isActive: boolean;
};

export type BossTimelineEventCandidate = {
  id: string;
  reportCode: string;
  fightId: number;
  timestamp: number;
  relativeTime: number;
  displayTime: string;
  sourceId?: number;
  sourceName?: string;
  abilityGameId?: number;
  abilityName: string;
  eventType: "cast" | "begincast" | "damage" | "applydebuff" | "unknown";
  targetType: EventTarget;
  damageType: DamageType;
  mitigationRelevant: boolean;
  confidence: "high" | "medium" | "low";
  source: "fflogs";
  severity?: Severity;
  observedDamage?: TimelineEvent["observedDamage"];
  notes?: string;
};

export type DamageProfileEvent = {
  id: string;
  reportCode: string;
  fightId: number;
  abilityGameId?: number;
  abilityName: string;
  matchedTimelineEventId?: string;
  timestamp: number;
  relativeTime: number;
  displayTime: string;
  damageType: DamageType;
  targetCount: number;
  hitCount: number;
  minDamage: number;
  maxDamage: number;
  medianDamage: number;
  averageDamage: number;
  totalDamage: number;
  overkillCount?: number;
  wasFatal?: boolean;
  severity: Severity;
  notes?: string;
};

export type EncounterTemplate = {
  id: string;
  encounterCatalogueItemId?: string;
  name: string;
  shortName?: string;
  source: "manual" | "fflogs_single_report" | "fflogs_aggregate" | "community";
  status: "draft" | "reviewed" | "published";
  events: TimelineEvent[];
  damageProfile?: DamageProfileEvent[];
  sourceReports?: SourceReportSummary[];
  createdAt: string;
  updatedAt: string;
};

export type SourceReportSummary = {
  reportCode: string;
  fightId: number;
  fightName?: string;
  encounterId?: number;
  encounterName?: string;
  kill: boolean;
  duration: number;
  sourceUrl?: string;
};

export type FFLogsEvent = {
  timestamp: number;
  type?: string;
  sourceID?: number;
  sourceIsFriendly?: boolean;
  source?: { id?: number; name?: string; type?: string; subType?: string };
  targetID?: number;
  targetIsFriendly?: boolean;
  target?: { id?: number; name?: string; type?: string; subType?: string };
  abilityGameID?: number;
  ability?: { gameID?: number; name?: string; type?: number };
  abilityName?: string;
  amount?: number;
  unmitigatedAmount?: number;
  overkill?: number;
  hitType?: number;
};
