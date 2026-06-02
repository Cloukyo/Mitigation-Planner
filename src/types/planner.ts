export type DamageType = "physical" | "magical" | "both" | "darkness" | "unknown";
export type Role = "tank" | "healer" | "melee" | "ranged" | "caster" | "role";
export type EventTarget = "party" | "tank" | "single" | "stack" | "spread" | "mechanic" | "unknown";
export type Severity = "low" | "medium" | "high" | "lethal" | "unknown";
export type EventTag = "raidwide" | "tankbuster" | "bleed" | "stack" | "spread" | "transition" | "enrage" | "downtime" | "unknown";

export type Ability = {
  id: string;
  actionId?: number | null;
  name: string;
  job: string | "Role";
  jobs?: string[];
  aliases?: string[];
  role: Role;
  cooldown: number;
  duration: number;
  charges?: number;
  mitigationValue?: number | null;
  shieldValue?: number | null;
  healingPotency?: number | null;
  regenPotency?: number | null;
  damageType: Exclude<DamageType, "darkness">;
  targetType: "self" | "single" | "party" | "enemy" | "area";
  effectType:
    | "party_mitigation"
    | "self_mitigation"
    | "enemy_debuff"
    | "shield"
    | "healing"
    | "regen"
    | "invuln"
    | "utility";
  appliesToRaidwide: boolean;
  appliesToTankbuster: boolean;
  iconPath: string;
  missingIcon?: boolean;
  needsManualReview?: boolean;
  notes?: string;
  source?: "manual" | "xivapi" | "mitplan_reference" | "xivapi+manual";
};

export type TimelineEvent = {
  id: string;
  phaseId?: string;
  time: number;
  displayTime: string;
  name: string;
  abilityGameId?: number;
  damageType: DamageType;
  targetType: EventTarget;
  severity: Severity;
  eventTag?: EventTag;
  mitigationRelevant: boolean;
  observedDamage?: {
    sampleSize: number;
    targetCount: number;
    medianDamage: number;
    averageDamage: number;
    minDamage: number;
    maxDamage: number;
    totalDamage?: number;
    wasLikelyMitigated?: boolean;
    warning?: string;
  };
  notes?: string;
  source?: string;
};

export type MitigationPlacement = {
  id: string;
  planId: string;
  abilityId: string;
  playerId: string;
  time: number;
  locked?: boolean;
  notes?: string;
  createdBy?: string;
  updatedAt: string;
};

export type Player = {
  id: string;
  planId: string;
  name: string;
  job: string;
  role: Role;
  sortOrder: number;
};

export type EncounterPhase = {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
};

export type SourceLink = {
  label: string;
  url: string;
  type:
    | "timeline"
    | "mitigation_sheet"
    | "pastebin"
    | "guide"
    | "raidplan"
    | "reference"
    | "fflogs"
    | "cactbot"
    | "community_guide"
    | "spreadsheet"
    | "manual";
};

export type Encounter = {
  id: string;
  name: string;
  shortName: string;
  expansion?: string;
  patch?: string;
  phases: EncounterPhase[];
  events: TimelineEvent[];
  sourceLinks: SourceLink[];
};

export type Plan = {
  id: string;
  title: string;
  encounterName?: string;
  encounterId?: string;
  ownerId: string;
  visibility: "private" | "unlisted" | "public";
  shareSlug: string;
  progNotes?: {
    currentPhase?: string;
    unresolvedMechanics?: string;
    mitigationQuestions?: string;
    sourceLinks?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type PlannerExport = {
  version: 1;
  plan: Plan;
  players: Player[];
  encounter: Encounter;
  placements: MitigationPlacement[];
};

export type Warning = {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
  placementId?: string;
  eventId?: string;
};
