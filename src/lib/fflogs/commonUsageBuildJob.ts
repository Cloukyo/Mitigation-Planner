import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aggregateCommonUsage } from "@/lib/fflogs/aggregateCommonUsage";
import { discoverReports } from "@/lib/fflogs/discoverReports";
import { extractActionTimeline } from "@/lib/fflogs/extractActionTimeline";
import { selectReportSamples } from "@/lib/fflogs/selectReportSamples";
import { enrichEventsWithMasterData, fetchFFLogsEvents, fetchFFLogsFight, fetchMasterData } from "@/lib/fflogs/server";
import type {
  CommonUsageBuildJob,
  CommonUsageLibraryEntry,
  CommonUsageSampleFilter,
  ExternalActionUsage,
  ReportPerformanceBand,
  ReportSampleCandidate
} from "@/lib/common-usage/commonUsageTypes";
import type { TimelineEvent } from "@/types/planner";

const CACHE_VERSION = "large-common-usage-v1";
const storeDir = path.join(process.cwd(), ".cache", "common-usage-jobs");
const jobsPath = path.join(storeDir, "jobs.json");
const extractionCachePath = path.join(storeDir, "extracted-fights.json");

type StoredBuildJob = CommonUsageBuildJob & {
  killOnly: boolean;
  performanceBand: ReportPerformanceBand;
  sampleFilter: CommonUsageSampleFilter;
  mitigationOnly: boolean;
  includeHealingCooldowns: boolean;
  includeSelfMitigation: boolean;
  timelineEvents: TimelineEvent[];
  candidates: ReportSampleCandidate[];
  selectedSamples: ReportSampleCandidate[];
  processedSampleKeys: string[];
  usages: ExternalActionUsage[];
  matchedCooldownActionCount: number;
};

type CreateBuildJobInput = {
  encounterTemplateId: string;
  encounterName: string;
  fflogsZoneId?: number;
  gameZoneId?: number;
  fflogsEncounterId?: number;
  job?: string;
  role?: string;
  requestedSampleSize: number;
  hardMaximum?: number;
  killOnly: boolean;
  performanceBand: ReportPerformanceBand;
  sampleFilter?: CommonUsageSampleFilter;
  mitigationOnly?: boolean;
  includeHealingCooldowns?: boolean;
  includeSelfMitigation?: boolean;
  timelineEvents?: TimelineEvent[];
};

type ExtractionCache = Record<string, ExternalActionUsage[]>;

function sampleKey(sample: ReportSampleCandidate) {
  return `${sample.reportCode}:${sample.fightId}`;
}

async function ensureStore() {
  await mkdir(storeDir, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await ensureStore();
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function readJobs() {
  return readJson<StoredBuildJob[]>(jobsPath, []);
}

async function writeJobs(jobs: StoredBuildJob[]) {
  await writeJson(jobsPath, jobs);
}

function publicJob(job: StoredBuildJob): CommonUsageBuildJob & {
  discoveredReportCount: number;
  selectedFightCount: number;
  matchedCooldownActionCount: number;
} {
  return {
    id: job.id,
    encounterTemplateId: job.encounterTemplateId,
    encounterName: job.encounterName,
    fflogsEncounterId: job.fflogsEncounterId,
    fflogsZoneId: job.fflogsZoneId,
    job: job.job,
    role: job.role,
    requestedSampleSize: job.requestedSampleSize,
    processedReportCount: job.processedReportCount,
    processedFightCount: job.processedFightCount,
    status: job.status,
    progressMessage: job.progressMessage,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    discoveredReportCount: new Set(job.candidates.map((candidate) => candidate.reportCode)).size,
    selectedFightCount: job.selectedSamples.length,
    matchedCooldownActionCount: job.matchedCooldownActionCount
  };
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("rate limit") || message.includes("429");
}

async function saveJob(nextJob: StoredBuildJob) {
  const jobs = await readJobs();
  await writeJobs([nextJob, ...jobs.filter((job) => job.id !== nextJob.id)]);
  return nextJob;
}

export async function createCommonUsageBuildJob(input: CreateBuildJobInput) {
  const hardMaximum = input.hardMaximum ?? Number(process.env.COMMON_USAGE_LARGE_SAMPLE_MAX ?? 100);
  const requestedSampleSize = Math.min(Math.max(input.requestedSampleSize, 25), Math.max(25, hardMaximum));
  const createdAt = new Date().toISOString();
  const candidates: ReportSampleCandidate[] = [];
  const seen = new Set<string>();
  let selectedSamples: ReportSampleCandidate[] = [];
  const pageSize = 50;
  const maxPages = Math.ceil((requestedSampleSize * 3) / pageSize) + 4;

  for (let page = 1; page <= maxPages; page += 1) {
    const pageCandidates = await discoverReports({
      fflogsZoneId: input.fflogsZoneId,
      gameZoneId: input.gameZoneId,
      fflogsEncounterId: input.fflogsEncounterId,
      limit: pageSize,
      page
    });
    for (const candidate of pageCandidates) {
      const key = sampleKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(candidate);
    }
    selectedSamples = selectReportSamples({
      candidates,
      sampleSize: requestedSampleSize,
      killOnly: input.killOnly,
      performanceBand: input.performanceBand
    });
    if (selectedSamples.length >= requestedSampleSize || !pageCandidates.length) break;
  }

  const job: StoredBuildJob = {
    id: `common-usage-job-${input.encounterTemplateId}-${input.job ?? input.role ?? "all"}-${Date.now()}`,
    encounterTemplateId: input.encounterTemplateId,
    encounterName: input.encounterName,
    fflogsEncounterId: input.fflogsEncounterId,
    fflogsZoneId: input.fflogsZoneId,
    job: input.job,
    role: input.role,
    requestedSampleSize,
    processedReportCount: 0,
    processedFightCount: 0,
    status: selectedSamples.length ? "queued" : "failed",
    progressMessage: selectedSamples.length
      ? `Discovered ${candidates.length} candidate fights and selected ${selectedSamples.length} public kill samples.`
      : "No public kill samples matched the requested filters.",
    errorMessage: selectedSamples.length ? undefined : "No public kill samples matched the requested filters.",
    createdAt,
    updatedAt: createdAt,
    killOnly: input.killOnly,
    performanceBand: input.performanceBand,
    sampleFilter: input.sampleFilter ?? (input.performanceBand === "top_25" ? "top25" : input.performanceBand === "median" ? "median" : "any"),
    mitigationOnly: input.mitigationOnly ?? true,
    includeHealingCooldowns: input.includeHealingCooldowns ?? true,
    includeSelfMitigation: input.includeSelfMitigation ?? true,
    timelineEvents: input.timelineEvents ?? [],
    candidates,
    selectedSamples,
    processedSampleKeys: [],
    usages: [],
    matchedCooldownActionCount: 0
  };
  await saveJob(job);
  return { job: publicJob(job) };
}

export async function getCommonUsageBuildJob(jobId: string) {
  const job = (await readJobs()).find((item) => item.id === jobId);
  if (!job) throw new Error("Common usage build job was not found.");
  return { job: publicJob(job) };
}

export async function runCommonUsageBuildJobBatch(jobId: string, batchSize = 3) {
  let job = (await readJobs()).find((item) => item.id === jobId);
  if (!job) throw new Error("Common usage build job was not found.");
  if (job.status === "completed" || job.status === "failed") return { job: publicJob(job) };

  const now = new Date().toISOString();
  job = {
    ...job,
    status: "running",
    startedAt: job.startedAt ?? now,
    updatedAt: now,
    progressMessage: "Processing FFLogs samples in a small batch."
  };
  const processed = new Set(job.processedSampleKeys);
  const nextSamples = job.selectedSamples.filter((sample) => !processed.has(sampleKey(sample))).slice(0, Math.min(Math.max(batchSize, 1), 5));
  const extractionCache = await readJson<ExtractionCache>(extractionCachePath, {});

  try {
    for (const sample of nextSamples) {
      if (!sample.fightId) continue;
      const key = `${CACHE_VERSION}:${sample.reportCode}:${sample.fightId}:${job.encounterTemplateId}:${job.job ?? "all"}:${job.role ?? "all"}:${job.includeHealingCooldowns}:${job.includeSelfMitigation}`;
      let usages = extractionCache[key];
      if (!usages) {
        const { fight } = await fetchFFLogsFight(sample.reportCode, sample.fightId);
        const masterData = await fetchMasterData(sample.reportCode);
        const castEvents = enrichEventsWithMasterData(await fetchFFLogsEvents(sample.reportCode, fight, "Casts", "Friendlies"), masterData);
        usages = extractActionTimeline({
          reportCode: sample.reportCode,
          fightId: sample.fightId,
          fightStartTime: fight.startTime,
          encounterTemplateId: job.encounterTemplateId,
          events: castEvents,
          timelineEvents: job.timelineEvents,
          options: {
            job: job.job,
            role: job.role,
            mitigationOnly: job.mitigationOnly,
            includeHealingCooldowns: job.includeHealingCooldowns,
            includeSelfMitigation: job.includeSelfMitigation
          }
        });
        extractionCache[key] = usages;
        await writeJson(extractionCachePath, extractionCache);
      }
      job.usages = [...job.usages.filter((usage) => !(usage.reportCode === sample.reportCode && usage.fightId === sample.fightId)), ...usages];
      processed.add(sampleKey(sample));
    }

    const processedReports = new Set(job.selectedSamples.filter((sample) => processed.has(sampleKey(sample))).map((sample) => sample.reportCode));
    const completed = processed.size >= job.selectedSamples.length;
    job = {
      ...job,
      processedSampleKeys: [...processed],
      processedReportCount: processedReports.size,
      processedFightCount: processed.size,
      matchedCooldownActionCount: job.usages.filter((usage) => usage.abilityId).length,
      status: completed ? "completed" : "running",
      completedAt: completed ? new Date().toISOString() : job.completedAt,
      updatedAt: new Date().toISOString(),
      progressMessage: completed
        ? `Completed ${processed.size}/${job.selectedSamples.length} selected fights.`
        : `Processed ${processed.size}/${job.selectedSamples.length} selected fights. Run the next batch to continue.`
    };
    await saveJob(job);
    return { job: publicJob(job) };
  } catch (error) {
    job = {
      ...job,
      status: isRateLimitError(error) ? "paused" : "failed",
      errorMessage: error instanceof Error ? error.message : "Could not process FFLogs batch.",
      progressMessage: isRateLimitError(error) ? "FFLogs rate limit reached. Job paused; wait before running another batch." : "The batch failed.",
      updatedAt: new Date().toISOString()
    };
    await saveJob(job);
    return { job: publicJob(job) };
  }
}

export async function finalizeCommonUsageBuildJob(jobId: string) {
  const job = (await readJobs()).find((item) => item.id === jobId);
  if (!job) throw new Error("Common usage build job was not found.");
  if (job.status !== "completed") throw new Error("Common usage build job is not complete yet.");
  const timings = aggregateCommonUsage(job.usages, job.encounterTemplateId, job.processedFightCount);
  const now = new Date().toISOString();
  const entry: CommonUsageLibraryEntry = {
    id: `common-library-${job.encounterTemplateId}-${job.job ?? job.role ?? "all"}-large-${Date.now()}`,
    encounterTemplateId: job.encounterTemplateId,
    encounterName: job.encounterName,
    job: job.job,
    role: job.role,
    source: "fflogs_public_sample",
    performanceBand: job.performanceBand,
    sampleFilter: job.sampleFilter,
    buildJobId: job.id,
    requestedSampleSize: job.requestedSampleSize,
    actualSampleSize: job.processedFightCount,
    processedReportCount: job.processedReportCount,
    processedFightCount: job.processedFightCount,
    generatedBy: "large_cached_sample",
    cacheVersion: CACHE_VERSION,
    sampleSize: job.requestedSampleSize,
    reportCount: job.processedReportCount,
    fightCount: job.processedFightCount,
    status: "draft",
    timings,
    sourceReports: job.selectedSamples.filter((sample) => job.processedSampleKeys.includes(sampleKey(sample))),
    createdAt: now,
    updatedAt: now,
    notes: "Common usage from FFLogs sample. Reference timing only; observed in logs and may reflect speedkill or reclear strategies."
  };
  return { job: publicJob(job), entry };
}
