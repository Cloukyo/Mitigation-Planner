import type { StoredCommonUsage } from "@/lib/common-usage/commonUsageStorage";
import type { Encounter, MitigationPlacement, Plan, Player, PlannerExport, TimelineEvent } from "@/types/planner";

export type PlanVisibility = "private" | "unlisted" | "public";

export type PlanSnapshot = PlannerExport & {
  commonUsage?: StoredCommonUsage;
};

export type SavedPlanSummary = {
  id: string;
  title: string;
  encounterName?: string;
  encounterTemplateId?: string;
  shareSlug: string;
  visibility: PlanVisibility;
  updatedAt: string;
  createdAt: string;
};

export type LoadedPlanSnapshot = {
  snapshot: PlanSnapshot;
  access: "owner" | "editor" | "viewer";
  canEdit: boolean;
};

export type DatabasePlanRows = {
  plan: Plan;
  players: Player[];
  encounter: Encounter;
  placements: MitigationPlacement[];
  events: TimelineEvent[];
  commonUsage?: StoredCommonUsage;
};
