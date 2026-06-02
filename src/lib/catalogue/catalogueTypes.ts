import type { DamageProfileEvent, SourceReportSummary } from "@/lib/fflogs/types";
import type { TimelineEvent } from "@/types/planner";

export type FightCatalogueGroup = {
  id: string;
  name: string;
  type: "expansion" | "content_type" | "zone" | "tier" | "patch";
  sortOrder: number;
  parentId?: string;
};

export type EncounterCatalogueItem = {
  id: string;
  name: string;
  shortName?: string;
  expansion: string;
  patch?: string;
  contentType: "ultimate" | "savage" | "extreme" | "criterion" | "normal" | "alliance" | "unknown";
  zoneName?: string;
  tierName?: string;
  difficulty?: string;
  fflogsZoneId?: number;
  fflogsEncounterId?: number;
  needsFflogsMapping?: boolean;
  isCurrent: boolean;
  isPublished: boolean;
  hasPublishedTemplate: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TemplateSourceLink = {
  label: string;
  url: string;
  type: "fflogs" | "cactbot" | "community_guide" | "spreadsheet" | "raidplan" | "manual";
};

export type EncounterTemplate = {
  id: string;
  encounterCatalogueItemId: string;
  name: string;
  shortName?: string;
  source: "manual" | "fflogs_curated_reports" | "cactbot" | "community" | "mixed";
  status: "draft" | "reviewed" | "published";
  events: TimelineEvent[];
  sourceReports?: SourceReportSummary[];
  sourceLinks?: TemplateSourceLink[];
  damageProfile?: DamageProfileEvent[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupedFightSection = {
  group: FightCatalogueGroup;
  contentTypes: Array<{
    contentType: EncounterCatalogueItem["contentType"];
    encounters: EncounterCatalogueItem[];
  }>;
};
