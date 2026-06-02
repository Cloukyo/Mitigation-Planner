export type UsageConfidence = "high" | "medium" | "low";
export type UsageSourceKind = "fflogs" | "manual" | "m_spec_reference";
export type ReportPerformanceBand = "any" | "top_25" | "median";
export type CommonUsageSampleFilter = "any" | "top25" | "median" | "unavailable";
export type CommonUsageGeneratedBy = "live_sample" | "large_cached_sample" | "manual_paste" | "single_report";

export type CommonUsageBuildJob = {
  id: string;
  encounterTemplateId: string;
  encounterName: string;
  fflogsEncounterId?: number;
  fflogsZoneId?: number;
  job?: string;
  role?: string;
  requestedSampleSize: number;
  processedReportCount: number;
  processedFightCount: number;
  status: "queued" | "running" | "paused" | "completed" | "failed";
  progressMessage?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CommonUsageSource = {
  id: string;
  encounterTemplateId: string;
  sourceType: "fflogs_single_report" | "fflogs_multiple_reports" | "manual_paste" | "m_spec_reference";
  reportCodes?: string[];
  fightIds?: number[];
  job?: string;
  role?: string;
  performanceBand?: ReportPerformanceBand;
  createdAt: string;
  updatedAt: string;
  notes?: string;
};

export type ExternalActionUsage = {
  id: string;
  sourceId: string;
  source: UsageSourceKind;
  reportCode?: string;
  fightId?: number;
  encounterTemplateId?: string;
  actorName?: string;
  actorId?: number;
  sourceJob?: string;
  sourceRole?: string;
  abilityGameId?: number;
  abilityName: string;
  abilityId?: string;
  timestamp: number;
  displayTime: string;
  eventType: "cast" | "applybuff" | "applydebuff" | "removebuff" | "removedebuff" | "heal" | "damage" | "unknown";
  matchedTimelineEventId?: string;
  offsetFromNearestEvent?: number;
  confidence: UsageConfidence;
  importStatus: "pending" | "accepted" | "ignored";
  notes?: string;
};

export type CommonUsageTiming = {
  id: string;
  encounterTemplateId: string;
  job?: string;
  role?: string;
  abilityGameId?: number;
  abilityName: string;
  abilityId?: string;
  medianTime: number;
  earliestTime: number;
  latestTime: number;
  displayTime: string;
  usageCount: number;
  sampleSize: number;
  usageRate: number;
  nearestEventId?: string;
  nearestEventName?: string;
  medianOffsetFromNearestEvent?: number;
  confidence: UsageConfidence;
  source: "fflogs_aggregate" | "manual_import" | "m_spec_reference";
  notes?: string;
};

export type ReportSampleCandidate = {
  reportCode: string;
  reportTitle?: string;
  fightId?: number;
  encounterId?: number;
  encounterName?: string;
  zoneId?: number;
  startTime?: number;
  duration?: number;
  kill?: boolean;
  percentage?: number;
  parsePercentile?: number;
  percentile?: number;
  performanceBand?: ReportPerformanceBand;
  sourceUrl?: string;
  included: boolean;
  exclusionReason?: string;
};

export type CommonUsageBuildRequest = {
  encounterTemplateId: string;
  fflogsEncounterId?: number;
  fflogsZoneId?: number;
  job?: string;
  role?: string;
  sampleSize: number;
  killOnly: boolean;
  performanceBand: ReportPerformanceBand;
  sampleFilter?: CommonUsageSampleFilter;
  dateRange?: {
    start?: string;
    end?: string;
  };
  mitigationOnly: boolean;
};

export type CommonUsageLibraryEntry = {
  id: string;
  encounterTemplateId: string;
  encounterName: string;
  job?: string;
  role?: string;
  source: "fflogs_public_sample";
  performanceBand: ReportPerformanceBand;
  sampleFilter?: CommonUsageSampleFilter;
  buildJobId?: string;
  requestedSampleSize?: number;
  actualSampleSize?: number;
  processedReportCount?: number;
  processedFightCount?: number;
  generatedBy?: CommonUsageGeneratedBy;
  cacheVersion?: string;
  sampleSize: number;
  reportCount: number;
  fightCount: number;
  status: "draft" | "reviewed" | "published";
  timings: CommonUsageTiming[];
  sourceReports: ReportSampleCandidate[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
};

export type CommonUsageLayer = {
  id: string;
  planId: string;
  encounterTemplateId: string;
  sourceId: string;
  enabled: boolean;
  opacity: number;
  filters: {
    jobs?: string[];
    roles?: string[];
    mitigationOnly?: boolean;
    showHealingCooldowns?: boolean;
    showTankCooldowns?: boolean;
    showRoleMitigation?: boolean;
    showSelfMitigation?: boolean;
    showUnmatched?: boolean;
    confidence?: UsageConfidence[];
    sources?: UsageSourceKind[];
  };
};

export type CommonUsageImportBundle = {
  source: CommonUsageSource;
  usages: ExternalActionUsage[];
  layer: CommonUsageLayer;
};
