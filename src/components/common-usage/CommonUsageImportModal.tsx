"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import jobs from "@/data/jobs/jobs.json";
import { CommonUsagePreviewTable } from "@/components/common-usage/CommonUsagePreviewTable";
import { performanceBandDescription, performanceBandLabel, readCommonUsageLibrary, saveCommonUsageLibraryEntry } from "@/lib/common-usage/commonUsageLibrary";
import { getSeedCommonUsage } from "@/lib/common-usage/commonUsageSeed";
import { parseManualActionTimeline } from "@/lib/common-usage/parseManualActionTimeline";
import { saveCommonUsageBundle } from "@/lib/common-usage/commonUsageStorage";
import { formatTime } from "@/lib/time";
import type {
  CommonUsageImportBundle,
  CommonUsageBuildJob,
  CommonUsageLayer,
  CommonUsageLibraryEntry,
  CommonUsageSampleFilter,
  CommonUsageSource,
  CommonUsageTiming,
  ExternalActionUsage,
  ReportPerformanceBand,
  ReportSampleCandidate
} from "@/lib/common-usage/commonUsageTypes";
import type { FFLogsFightSummary, FFLogsReport } from "@/lib/fflogs/types";
import type { Encounter, Plan } from "@/types/planner";

const jobRows = jobs as Array<{ abbr: string; name: string; role: string }>;
const roles = ["tank", "healer", "melee", "ranged", "caster"];
type SourceMode = "library" | "manual" | "fflogs" | "public" | "cached";
type LargeBuildJobView = CommonUsageBuildJob & {
  discoveredReportCount?: number;
  selectedFightCount?: number;
  matchedCooldownActionCount?: number;
};
type SavedReferenceOption = {
  id: string;
  label: string;
  type: "all" | "seed" | "saved";
  entry?: CommonUsageLibraryEntry;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload as T;
}

function defaultLayer(plan: Plan, encounter: Encounter, source: CommonUsageSource): CommonUsageLayer {
  return {
    id: `layer-${source.id}`,
    planId: plan.id,
    encounterTemplateId: encounter.id,
    sourceId: source.id,
    enabled: true,
    opacity: 0.82,
    filters: {
      mitigationOnly: true,
      showHealingCooldowns: true,
      showTankCooldowns: true,
      showRoleMitigation: true,
      showSelfMitigation: true,
      showUnmatched: false,
      confidence: ["high", "medium", "low"],
      sources: ["fflogs", "manual", "m_spec_reference"]
    }
  };
}

function timingsToOverlayUsages(entry: CommonUsageLibraryEntry, sourceId: string): ExternalActionUsage[] {
  return entry.timings.map((timing: CommonUsageTiming) => ({
    id: `public-sample-${entry.id}-${timing.id}`,
    sourceId,
    source: "fflogs",
    encounterTemplateId: entry.encounterTemplateId,
    sourceJob: timing.job,
    sourceRole: timing.role,
    abilityGameId: timing.abilityGameId,
    abilityName: timing.abilityName,
    abilityId: timing.abilityId,
    timestamp: timing.medianTime,
    displayTime: timing.displayTime || formatTime(timing.medianTime),
    eventType: "cast",
    matchedTimelineEventId: timing.nearestEventId,
    offsetFromNearestEvent: timing.medianOffsetFromNearestEvent,
    confidence: timing.confidence,
    importStatus: "pending",
    notes: timing.notes ?? `Aggregated from ${timing.usageCount}/${timing.sampleSize} selected public samples.`
  }));
}

function savedLibraryEntryToUsages({
  entry,
  sourceId,
  job,
  role
}: {
  entry: CommonUsageLibraryEntry;
  sourceId: string;
  job?: string;
  role?: string;
}) {
  const timings = entry.timings.filter((timing) => {
    if (job && timing.job !== job) return false;
    if (role && timing.role !== role) return false;
    return true;
  });
  return timingsToOverlayUsages({ ...entry, timings }, sourceId);
}

function entryLabel(entry: CommonUsageLibraryEntry) {
  const target = [entry.job, entry.role].filter(Boolean).join(" / ") || "All jobs";
  if (entry.generatedBy === "large_cached_sample") {
    const generatedDate = new Date(entry.createdAt).toLocaleDateString();
    return `${entry.encounterName} / ${target} / ${entry.actualSampleSize ?? entry.fightCount}-log sample / ${generatedDate}`;
  }
  return `${entry.encounterName} - ${target} - ${performanceBandLabel(entry.performanceBand)} - ${entry.fightCount} fights`;
}

export function CommonUsageImportModal({
  open,
  onClose,
  plan,
  encounter
}: {
  open: boolean;
  onClose: () => void;
  plan: Plan;
  encounter: Encounter;
}) {
  const [sourceMode, setSourceMode] = useState<SourceMode>("library");
  const [manualText, setManualText] = useState("00:14 | Scholar | Sacred Soil\n00:42 | Scholar | Expedient\n01:12 | Scholar | Deployment Tactics");
  const [reportInput, setReportInput] = useState("");
  const [report, setReport] = useState<FFLogsReport | null>(null);
  const [selectedFightId, setSelectedFightId] = useState<number | undefined>();
  const [jobFilter, setJobFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [includeHealingCooldowns, setIncludeHealingCooldowns] = useState(true);
  const [includeSelfMitigation, setIncludeSelfMitigation] = useState(true);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [performanceBand, setPerformanceBand] = useState<ReportPerformanceBand>("any");
  const [sampleSize, setSampleSize] = useState(5);
  const [largeSampleSize, setLargeSampleSize] = useState(50);
  const [killOnly, setKillOnly] = useState(true);
  const [largeBuildJob, setLargeBuildJob] = useState<LargeBuildJobView | null>(null);
  const [savedLibraryEntries, setSavedLibraryEntries] = useState<CommonUsageLibraryEntry[]>([]);
  const [selectedLibraryReferenceId, setSelectedLibraryReferenceId] = useState("all");
  const [sampleCandidates, setSampleCandidates] = useState<ReportSampleCandidate[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<ReportSampleCandidate[]>([]);
  const [discoveryWarning, setDiscoveryWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [effectivePerformanceBand, setEffectivePerformanceBand] = useState<ReportPerformanceBand>("any");
  const [sampleFilter, setSampleFilter] = useState<CommonUsageSampleFilter>("any");
  const [libraryEntry, setLibraryEntry] = useState<CommonUsageLibraryEntry | null>(null);
  const [usages, setUsages] = useState<ExternalActionUsage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFight = useMemo(() => report?.fights.find((fight) => fight.id === selectedFightId), [report, selectedFightId]);
  const savedReferencesForEncounter = useMemo(() => savedLibraryEntries.filter((entry) => entry.encounterTemplateId === encounter.id), [encounter.id, savedLibraryEntries]);
  const currentJob = jobFilter === "all" ? undefined : jobFilter;
  const currentRole = roleFilter === "all" ? undefined : roleFilter;
  const isDmu = plan.encounterId === "dmu" || encounter.id === "dmu" || encounter.shortName === "DMU";
  const hasBroadPublicFilter = (sourceMode === "public" || sourceMode === "cached") && !currentJob && Boolean(currentRole);
  const savedReferenceOptions = useMemo<SavedReferenceOption[]>(() => {
    const options: SavedReferenceOption[] = [{ id: "all", label: "All matching saved and starter references", type: "all" }];
    options.push(...savedReferencesForEncounter.map((entry) => ({ id: entry.id, label: entryLabel(entry), type: "saved" as const, entry })));
    options.push({ id: "seed", label: "Built-in starter reference", type: "seed" });
    return options;
  }, [savedReferencesForEncounter]);
  const primaryActionLabel =
    sourceMode === "library"
      ? "Load saved reference"
      : sourceMode === "manual"
        ? "Preview pasted actions"
        : sourceMode === "public"
          ? sampleCandidates.length
            ? "Build from FFLogs public samples"
            : "Discover FFLogs public samples"
          : sourceMode === "cached"
            ? !largeBuildJob
              ? "Create build job"
              : largeBuildJob.status === "completed"
                ? "Save/load cached sample"
                : largeBuildJob.status === "paused"
                  ? "Run next batch"
                  : "Run next batch"
          : report
            ? "Preview FFLogs actions"
            : "Fetch fights from report";

  useEffect(() => {
    if (!open) return;
    setSavedLibraryEntries(readCommonUsageLibrary());
  }, [open]);

  if (!open) return null;

  function setMode(nextMode: SourceMode) {
    setSourceMode(nextMode);
    setError(null);
    setSuccessMessage(null);
    setDiscoveryWarning(null);
    setUsages([]);
    setSelectedIds(new Set());
    setSampleCandidates([]);
    setSelectedSamples([]);
    setLibraryEntry(null);
    setLargeBuildJob(null);
  }

  function setPreview(next: ExternalActionUsage[]) {
    setUsages(next);
    setSelectedIds(new Set(next.filter((usage) => usage.abilityId || showUnmatched).map((usage) => usage.id)));
  }

  function clearPublicSamples() {
    setSampleCandidates([]);
    setSelectedSamples([]);
    setDiscoveryWarning(null);
    setLibraryEntry(null);
    setSuccessMessage(null);
  }

  function clearLargeJob() {
    setLargeBuildJob(null);
    setLibraryEntry(null);
    setSuccessMessage(null);
    setDiscoveryWarning(null);
    setUsages([]);
    setSelectedIds(new Set());
  }

  function previewLibrary() {
    const sourceId = `source-library-${encounter.id}-${jobFilter}-${roleFilter}-${Date.now()}`;
    const selectedOption = savedReferenceOptions.find((option) => option.id === selectedLibraryReferenceId) ?? savedReferenceOptions[0];
    const savedEntries =
      selectedOption.type === "saved" && selectedOption.entry
        ? [selectedOption.entry]
        : selectedOption.type === "seed"
          ? []
          : savedReferencesForEncounter;
    const savedReference = savedEntries.flatMap((entry) =>
      savedLibraryEntryToUsages({
        entry,
        sourceId,
        job: currentJob,
        role: currentRole
      })
    );
    const seedReference =
      selectedOption.type === "saved"
        ? []
        : getSeedCommonUsage({
            encounterTemplateId: encounter.id,
            sourceId,
            job: currentJob,
            role: currentRole,
            timelineEvents: encounter.events
          });
    const reference = [...savedReference, ...seedReference].sort((a, b) => a.timestamp - b.timestamp);
    setPreview(reference);
    setSuccessMessage(null);
    if (!reference.length) {
      const broadHint = roleFilter !== "all" && jobFilter === "all" ? " Try selecting a specific job first, such as SCH, PLD or GNB." : "";
      if (savedReferencesForEncounter.length || seedReference.length) {
        setError(`No saved common usage reference matches the current fight/job filters.${broadHint}`);
      } else if (isDmu) {
        setError("No DMU common usage data exists yet. During early prog, use manual planning. After logs are available, use FFLogs import or build public samples.");
      } else {
        setError(`No saved common usage reference exists for this fight/job yet. Choose 'Build from FFLogs public samples' to create one.${broadHint}`);
      }
    } else {
      setError(null);
    }
  }

  function previewManual() {
    const sourceId = `source-manual-${Date.now()}`;
    const parsed = parseManualActionTimeline({
      text: manualText,
      sourceId,
      encounterTemplateId: encounter.id,
      timelineEvents: encounter.events,
      keepUnmatched: showUnmatched
    }).filter((usage) => {
      if (jobFilter !== "all" && usage.sourceJob !== jobFilter) return false;
      if (roleFilter !== "all" && usage.sourceRole !== roleFilter) return false;
      return true;
    });
    setPreview(parsed);
  }

  async function loadReport(input = reportInput) {
    setLoading(true);
    setError(null);
    try {
      const payload = await postJson<{ report: FFLogsReport; selectedFightId?: number }>("/api/fflogs/report", { report: input });
      setReport(payload.report);
      setReportInput(input);
      setSelectedFightId(payload.selectedFightId ?? payload.report.fights[0]?.id);
      setUsages([]);
      setSelectedIds(new Set());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not fetch FFLogs report.");
    } finally {
      setLoading(false);
    }
  }

  async function previewFFLogs() {
    if (!selectedFightId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await postJson<{ usages: ExternalActionUsage[] }>("/api/fflogs/import-actions", {
        report: reportInput,
        fightId: selectedFightId,
        encounterTemplateId: encounter.id,
        timelineEvents: encounter.events,
        job: jobFilter === "all" ? undefined : jobFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        mitigationOnly: true,
        includeHealingCooldowns,
        includeSelfMitigation,
        showUnmatched
      });
      setPreview(payload.usages);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import FFLogs action usage.");
    } finally {
      setLoading(false);
    }
  }

  async function discoverPublicSamples() {
    setLoading(true);
    setError(null);
    setDiscoveryWarning(null);
    setLibraryEntry(null);
    setUsages([]);
    setSelectedIds(new Set());
    try {
      const payload = await postJson<{
        candidates: ReportSampleCandidate[];
        selected: ReportSampleCandidate[];
        performanceBand: ReportPerformanceBand;
        effectivePerformanceBand: ReportPerformanceBand;
        sampleFilter: CommonUsageSampleFilter;
        warning?: string;
      }>("/api/fflogs/discover-reports", {
        encounterTemplateId: encounter.id,
        sampleSize,
        killOnly,
        performanceBand
      });
      const selectedKeys = new Set(payload.selected.map((sample) => `${sample.reportCode}:${sample.fightId}`));
      const reviewCandidates = payload.candidates
        .map((candidate) => ({ ...candidate, included: selectedKeys.has(`${candidate.reportCode}:${candidate.fightId}`) }))
        .filter((candidate) => candidate.included || (!killOnly || candidate.kill))
        .sort((left, right) => {
          if (left.included !== right.included) return left.included ? -1 : 1;
          if (Boolean(left.kill) !== Boolean(right.kill)) return left.kill ? -1 : 1;
          return (right.duration ?? 0) - (left.duration ?? 0);
        });
      setSampleCandidates(reviewCandidates);
      setSelectedSamples(payload.selected.map((sample) => ({ ...sample, included: true })));
      setEffectivePerformanceBand(payload.effectivePerformanceBand);
      setSampleFilter(payload.sampleFilter);
      setDiscoveryWarning(payload.warning ?? null);
      if (!payload.selected.length) {
        setError("FFLogs discovery returned candidates, but none matched the current kill/sample filters.");
      }
    } catch (caught) {
      setSampleCandidates([]);
      setSelectedSamples([]);
      const detail = caught instanceof Error ? ` ${caught.message}` : "";
      setError(`Could not discover public reports from FFLogs. Try a manual FFLogs report URL instead.${detail}`);
    } finally {
      setLoading(false);
    }
  }

  function toggleSample(candidate: ReportSampleCandidate) {
    const key = `${candidate.reportCode}:${candidate.fightId}`;
    setSelectedSamples((current) => {
      const exists = current.some((item) => `${item.reportCode}:${item.fightId}` === key);
      if (exists) {
        setSampleCandidates((items) => items.map((item) => (`${item.reportCode}:${item.fightId}` === key ? { ...item, included: false } : item)));
        return current.filter((item) => `${item.reportCode}:${item.fightId}` !== key);
      }
      if (current.length >= sampleSize) {
        setError(`Sample size is set to ${sampleSize}. Deselect a sample before adding another.`);
        return current;
      }
      setError(null);
      setSampleCandidates((items) => items.map((item) => (`${item.reportCode}:${item.fightId}` === key ? { ...item, included: true } : item)));
      return [...current, { ...candidate, included: true }];
    });
  }

  async function buildPublicSamples() {
    const selected = selectedSamples.slice(0, sampleSize).map((sample) => ({ ...sample, included: true }));
    if (!selected.length) {
      setError("Choose at least one public sample before building common usage.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await postJson<{ entry: CommonUsageLibraryEntry }>("/api/fflogs/build-common-usage", {
        encounterTemplateId: encounter.id,
        encounterName: encounter.name,
        samples: selected,
        timelineEvents: encounter.events,
        job: jobFilter === "all" ? undefined : jobFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        sampleSize: selected.length,
        killOnly: true,
        performanceBand: effectivePerformanceBand,
        sampleFilter,
        mitigationOnly: true,
        includeHealingCooldowns,
        includeSelfMitigation
      });
      const entry = { ...payload.entry, sourceReports: selected, sampleSize: selected.length, performanceBand: effectivePerformanceBand, sampleFilter };
      saveCommonUsageLibraryEntry(entry);
      setSavedLibraryEntries(readCommonUsageLibrary());
      setSelectedLibraryReferenceId(entry.id);
      setLibraryEntry(entry);
      const overlayUsages = timingsToOverlayUsages(entry, entry.id);
      setPreview(overlayUsages);
      const now = new Date().toISOString();
      const source: CommonUsageSource = {
        id: entry.id,
        encounterTemplateId: encounter.id,
        sourceType: "fflogs_multiple_reports",
        reportCodes: entry.sourceReports.map((sample) => sample.reportCode),
        fightIds: entry.sourceReports.flatMap((sample) => (sample.fightId ? [sample.fightId] : [])),
        job: entry.job,
        role: entry.role,
        performanceBand: entry.performanceBand,
        createdAt: now,
        updatedAt: now,
        notes: `FFLogs public-sample aggregate (${performanceBandLabel(entry.performanceBand)}). Review before converting to plan placements.`
      };
      saveCommonUsageBundle({
        source,
        usages: overlayUsages,
        layer: defaultLayer(plan, encounter, source)
      });
      setSuccessMessage(`Built common usage from ${selected.length} selected FFLogs fights. Saved as draft and loaded as ghost markers.`);
      setDiscoveryWarning((current) => current ?? "Built and saved a draft common usage library entry. Review the selected markers before converting them to plan placements.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build common usage from FFLogs public samples.");
    } finally {
      setLoading(false);
    }
  }

  async function createLargeBuildJob() {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setDiscoveryWarning(null);
    setLibraryEntry(null);
    setUsages([]);
    setSelectedIds(new Set());
    try {
      const payload = await postJson<{ job: LargeBuildJobView }>("/api/fflogs/common-usage-jobs/create", {
        encounterTemplateId: encounter.id,
        encounterName: encounter.name,
        requestedSampleSize: largeSampleSize,
        killOnly,
        performanceBand,
        job: jobFilter === "all" ? undefined : jobFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        includeHealingCooldowns,
        includeSelfMitigation,
        timelineEvents: encounter.events
      });
      setLargeBuildJob(payload.job);
      if (payload.job.status === "failed") {
        setError(payload.job.errorMessage ?? "Could not create large cached sample build job.");
      } else {
        setDiscoveryWarning(payload.job.progressMessage ?? "Build job created. Run batches to process selected FFLogs samples.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create large cached sample build job.");
    } finally {
      setLoading(false);
    }
  }

  async function runLargeBuildBatch() {
    if (!largeBuildJob) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await postJson<{ job: LargeBuildJobView }>("/api/fflogs/common-usage-jobs/run-batch", {
        jobId: largeBuildJob.id,
        batchSize: 3
      });
      setLargeBuildJob(payload.job);
      setDiscoveryWarning(payload.job.progressMessage ?? null);
      if (payload.job.status === "paused") {
        setError(payload.job.errorMessage ?? "FFLogs rate limit reached. Wait before running another batch.");
      } else if (payload.job.status === "failed") {
        setError(payload.job.errorMessage ?? "The large cached sample build failed.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not run the next large-sample batch.");
    } finally {
      setLoading(false);
    }
  }

  async function finalizeLargeBuildJob() {
    if (!largeBuildJob) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await postJson<{ job: LargeBuildJobView; entry: CommonUsageLibraryEntry }>("/api/fflogs/common-usage-jobs/finalize", {
        jobId: largeBuildJob.id
      });
      const entry = payload.entry;
      saveCommonUsageLibraryEntry(entry);
      setSavedLibraryEntries(readCommonUsageLibrary());
      setSelectedLibraryReferenceId(entry.id);
      setLargeBuildJob(payload.job);
      setLibraryEntry(entry);
      const overlayUsages = timingsToOverlayUsages(entry, entry.id);
      setPreview(overlayUsages);
      const now = new Date().toISOString();
      const source: CommonUsageSource = {
        id: entry.id,
        encounterTemplateId: encounter.id,
        sourceType: "fflogs_multiple_reports",
        reportCodes: entry.sourceReports.map((sample) => sample.reportCode),
        fightIds: entry.sourceReports.flatMap((sample) => (sample.fightId ? [sample.fightId] : [])),
        job: entry.job,
        role: entry.role,
        performanceBand: entry.performanceBand,
        createdAt: now,
        updatedAt: now,
        notes: "Common usage from FFLogs sample. Reference timing only; observed in logs and may reflect speedkill or reclear strategies."
      };
      saveCommonUsageBundle({
        source,
        usages: overlayUsages,
        layer: defaultLayer(plan, encounter, source)
      });
      setSuccessMessage(`Saved cached common usage from ${entry.actualSampleSize ?? entry.fightCount} processed FFLogs fights. Loaded as ghost markers.`);
      setDiscoveryWarning("Large samples may take time and should be built once, then reused from the saved library.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the large cached sample.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function acceptOverlay() {
    const now = new Date().toISOString();
    const sourceId = usages[0]?.sourceId ?? `source-${sourceMode}-${Date.now()}`;
    const selectedUsages = usages.filter((usage) => selectedIds.has(usage.id)).map((usage) => ({ ...usage, sourceId }));
    const libraryUsesFFLogs = sourceMode === "library" && selectedUsages.some((usage) => usage.source === "fflogs");
    const source: CommonUsageSource = {
      id: sourceId,
      encounterTemplateId: encounter.id,
      sourceType: sourceMode === "public" || libraryUsesFFLogs ? "fflogs_multiple_reports" : sourceMode === "fflogs" ? "fflogs_single_report" : sourceMode === "library" ? "m_spec_reference" : "manual_paste",
      reportCodes: sourceMode === "public" ? libraryEntry?.sourceReports.map((sample) => sample.reportCode) : report ? [report.code] : undefined,
      fightIds: sourceMode === "public" ? libraryEntry?.sourceReports.flatMap((sample) => (sample.fightId ? [sample.fightId] : [])) : selectedFightId ? [selectedFightId] : undefined,
      job: jobFilter === "all" ? undefined : jobFilter,
      role: roleFilter === "all" ? undefined : roleFilter,
      performanceBand: sourceMode === "public" ? effectivePerformanceBand : performanceBand,
      createdAt: now,
      updatedAt: now,
      notes:
        sourceMode === "library"
          ? libraryUsesFFLogs
            ? "Saved FFLogs common usage library entry. Review before converting to plan placements."
            : "Published local common usage reference. Review before converting to plan placements."
          : sourceMode === "manual"
            ? "Manually pasted M-Spec-style action timeline. M-Spec was not scraped."
            : sourceMode === "public"
              ? `FFLogs public-sample aggregate (${performanceBandLabel(effectivePerformanceBand)}). Review before converting to plan placements.`
              : `FFLogs-derived common usage reference (${performanceBandLabel(performanceBand)}). Review before converting to plan placements.`
    };
    const bundle: CommonUsageImportBundle = {
      source,
      usages: selectedUsages,
      layer: defaultLayer(plan, encounter, source)
    };
    saveCommonUsageBundle(bundle);
    onClose();
  }

  function runPrimaryAction() {
    if (sourceMode === "library") {
      previewLibrary();
      return;
    }
    if (sourceMode === "manual") {
      previewManual();
      return;
    }
    if (sourceMode === "public") {
      if (sampleCandidates.length) {
        void buildPublicSamples();
      } else {
        void discoverPublicSamples();
      }
      return;
    }
    if (sourceMode === "cached") {
      if (!largeBuildJob) {
        void createLargeBuildJob();
      } else if (largeBuildJob.status === "completed") {
        void finalizeLargeBuildJob();
      } else {
        void runLargeBuildBatch();
      }
      return;
    }
    if (report && selectedFight) {
      void previewFFLogs();
      return;
    }
    void loadReport();
  }

  const primaryDisabled =
    sourceMode === "fflogs"
      ? loading || (!report && !reportInput.trim()) || (Boolean(report) && !selectedFight)
      : sourceMode === "public"
        ? loading || (sampleCandidates.length > 0 && selectedSamples.length === 0) || (!currentJob && !currentRole)
        : sourceMode === "cached"
          ? loading || (!currentJob && !currentRole) || largeBuildJob?.status === "failed"
        : false;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4">
      <div className="mx-auto flex max-h-[94vh] max-w-7xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Import common usage</h2>
            <p className="text-xs text-slate-400">M-Spec-style flow: choose a fight/job reference, preview timings, then add them as ghost markers. These are reference timings, not your actual plan.</p>
          </div>
          <button className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-900" onClick={onClose} aria-label="Close common usage import">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-5">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[24rem_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Source</label>
                <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" value={sourceMode} onChange={(event) => setMode(event.target.value as SourceMode)}>
                  <option value="library">Load saved common usage reference</option>
                  <option value="public">Build from FFLogs public samples</option>
                  <option value="cached">Build large cached sample</option>
                  <option value="fflogs">Import from one FFLogs report</option>
                  <option value="manual">Paste M-Spec-style rows</option>
                </select>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3 text-sm">
                <div className="font-semibold text-slate-100">{encounter.name}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {sourceMode === "library"
                    ? "Load an already-saved reference for this fight. Build from FFLogs public samples to create a new one."
                    : sourceMode === "public"
                      ? "Quick user-triggered build from 5/10/20 public FFLogs kill samples."
                      : sourceMode === "cached"
                        ? "Admin/dev build that processes larger FFLogs samples in batches and saves a reusable draft."
                      : sourceMode === "fflogs"
                        ? "Import cooldown usage from one report URL and fight."
                        : "Paste rows from a manual M-Spec-style action timeline."}
                </div>
                {isDmu ? (
                  <p className="mt-3 rounded-md border border-amber-300/30 bg-amber-300/10 p-2 text-xs text-amber-50">
                    No DMU common usage data exists yet. During early prog, use manual planning. After logs are available, use FFLogs import or build public samples.
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value);
                    clearPublicSamples();
                    clearLargeJob();
                  }}
                >
                  <option value="all">All roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={jobFilter}
                  onChange={(event) => {
                    setJobFilter(event.target.value);
                    clearPublicSamples();
                    clearLargeJob();
                  }}
                >
                  <option value="all">All jobs</option>
                  {jobRows.map((job) => (
                    <option key={job.abbr} value={job.abbr}>
                      {job.abbr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Log sample filter</label>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={performanceBand}
                  onChange={(event) => {
                    setPerformanceBand(event.target.value as ReportPerformanceBand);
                    clearPublicSamples();
                    clearLargeJob();
                  }}
                >
                  <option value="any">Any public kill samples</option>
                  <option value="top_25">Top 25% parses</option>
                  <option value="median">Median parses</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">{performanceBandDescription(performanceBand)}</p>
                {(sourceMode === "public" || sourceMode === "cached") && performanceBand !== "any" ? (
                  <p className="mt-1 text-xs text-amber-100">If FFLogs does not return percentile metadata, this will fall back to public kill samples and show a warning.</p>
                ) : sourceMode !== "public" && sourceMode !== "cached" ? (
                  <p className="mt-1 text-xs text-slate-500">This filter is only used when building from FFLogs public samples.</p>
                ) : null}
              </div>
              {sourceMode === "public" || sourceMode === "cached" ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Sample size</label>
                    {sourceMode === "cached" ? (
                      <select
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                        value={largeSampleSize}
                        onChange={(event) => {
                          setLargeSampleSize(Number(event.target.value));
                          clearLargeJob();
                        }}
                      >
                        {[25, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size} public kill samples
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                        value={sampleSize}
                        onChange={(event) => {
                          setSampleSize(Number(event.target.value));
                          clearPublicSamples();
                        }}
                      >
                        {[5, 10, 20].map((size) => (
                          <option key={size} value={size}>
                            {size} public kill samples
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <label className="flex items-center gap-2 rounded border border-slate-800 px-3 py-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={killOnly}
                      onChange={(event) => {
                        setKillOnly(event.target.checked);
                        clearPublicSamples();
                        clearLargeJob();
                      }}
                    />
                    Kill only
                  </label>
                  {sourceMode === "cached" ? (
                    <p className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-50">
                      Large samples may take time and should be built once, then reused from the saved library. Local dev jobs are stored on this machine and are not production multi-user storage.
                    </p>
                  ) : null}
                  {hasBroadPublicFilter ? <p className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-50">Try selecting a specific job first, such as SCH, PLD or GNB.</p> : null}
                </div>
              ) : null}
              <div className="grid gap-2 text-sm text-slate-300">
                <label className="flex items-center gap-2 rounded border border-slate-800 px-3 py-2">
                  <input type="checkbox" checked={includeHealingCooldowns} onChange={(event) => setIncludeHealingCooldowns(event.target.checked)} />
                  Include healing cooldowns
                </label>
                <label className="flex items-center gap-2 rounded border border-slate-800 px-3 py-2">
                  <input type="checkbox" checked={includeSelfMitigation} onChange={(event) => setIncludeSelfMitigation(event.target.checked)} />
                  Include self mitigation
                </label>
                <label className="flex items-center gap-2 rounded border border-slate-800 px-3 py-2">
                  <input type="checkbox" checked={showUnmatched} onChange={(event) => setShowUnmatched(event.target.checked)} />
                  Keep unmatched rows
                </label>
              </div>
              {sourceMode === "library" ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Saved reference</label>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                      value={selectedLibraryReferenceId}
                      onChange={(event) => setSelectedLibraryReferenceId(event.target.value)}
                    >
                      {savedReferenceOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-md border border-teal-300/30 bg-teal-300/10 p-3 text-sm text-teal-50">
                    This only loads built-in starter rows or references already saved from FFLogs/public sample builds.
                  </div>
                  {!savedReferencesForEncounter.length ? (
                    <p className="rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
                      {isDmu ? "No DMU common usage data exists yet. During early prog, use manual planning. After logs are available, use FFLogs import or build public samples." : "No saved reference yet. Build one from FFLogs public samples or paste rows."}
                    </p>
                  ) : null}
                </div>
              ) : sourceMode === "public" || sourceMode === "cached" ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-sky-300/30 bg-sky-300/10 p-3 text-sm text-sky-50">
                    {sourceMode === "cached"
                      ? `Create a large cached build job, then process selected reports in small batches for ${jobFilter === "all" ? "the selected role/job" : jobFilter}.`
                      : `Discover public kill reports for this encounter, review the selected fights, then aggregate matching ${jobFilter === "all" ? "job" : jobFilter} mitigation cooldowns.`}
                  </div>
                  {discoveryWarning ? <p className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-50">{discoveryWarning}</p> : null}
                  {largeBuildJob ? (
                    <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300">
                      <div className="mb-2 font-semibold text-slate-100">Large cached sample progress</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>Status: {largeBuildJob.status}</div>
                        <div>Reports discovered: {largeBuildJob.discoveredReportCount ?? 0}</div>
                        <div>Reports processed: {largeBuildJob.processedReportCount}</div>
                        <div>Fights processed: {largeBuildJob.processedFightCount}/{largeBuildJob.selectedFightCount ?? largeBuildJob.requestedSampleSize}</div>
                        <div>Matched cooldown actions: {largeBuildJob.matchedCooldownActionCount ?? 0}</div>
                        <div>Requested sample: {largeBuildJob.requestedSampleSize}</div>
                      </div>
                      {largeBuildJob.progressMessage ? <p className="mt-2 text-slate-400">{largeBuildJob.progressMessage}</p> : null}
                    </div>
                  ) : null}
                  {libraryEntry ? (
                    <div className="rounded-md border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-50">
                      Saved draft library entry with {libraryEntry.timings.length} aggregated timings from {libraryEntry.fightCount} fights.
                    </div>
                  ) : null}
                  {successMessage ? <p className="rounded-md border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-50">{successMessage}</p> : null}
                  {sampleCandidates.length ? (
                    <div className="max-h-64 overflow-auto rounded-md border border-slate-800">
                      <table className="w-full min-w-[520px] text-left text-xs">
                        <thead className="sticky top-0 bg-slate-950 text-slate-400">
                          <tr>
                            <th className="px-2 py-2">Use</th>
                            <th className="px-2 py-2">Fight</th>
                            <th className="px-2 py-2">Duration</th>
                            <th className="px-2 py-2">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleCandidates.map((candidate) => (
                            <tr key={`${candidate.reportCode}:${candidate.fightId}`} className="border-t border-slate-800">
                              <td className="px-2 py-2">
                                <input type="checkbox" checked={candidate.included} onChange={() => toggleSample(candidate)} aria-label={`Select FFLogs sample ${candidate.reportCode}`} />
                              </td>
                              <td className="px-2 py-2 text-slate-200">
                                <div>{candidate.encounterName ?? "FFLogs fight"} #{candidate.fightId}</div>
                                <div className="text-slate-500">{candidate.reportTitle ?? candidate.reportCode}</div>
                              </td>
                              <td className="px-2 py-2 text-slate-300">{candidate.duration ? formatTime(candidate.duration) : "-"}</td>
                              <td className="px-2 py-2 text-slate-300">{candidate.kill ? "Kill" : "Pull"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : sourceMode === "manual" ? (
                <div>
                  <textarea className="h-40 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200" value={manualText} onChange={(event) => setManualText(event.target.value)} />
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                    value={reportInput}
                    onChange={(event) => setReportInput(event.target.value)}
                    placeholder="https://www.fflogs.com/reports/..."
                  />
                  {report ? (
                    <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" value={selectedFightId} onChange={(event) => setSelectedFightId(Number(event.target.value))}>
                      {report.fights.map((fight: FFLogsFightSummary) => (
                        <option key={fight.id} value={fight.id}>
                          #{fight.id} {fight.encounterName ?? fight.name ?? "Fight"} {fight.kill ? "Kill" : "Pull"}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              )}
              {error ? <p className="rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-100">{error}</p> : null}
            </div>
            <div className="min-w-0 space-y-3">
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
                {selectedIds.size} of {usages.length} action markers selected
              </div>
              <CommonUsagePreviewTable
                usages={usages}
                selectedIds={selectedIds}
                timelineEvents={encounter.events}
                onToggle={toggle}
                onToggleAll={() => setSelectedIds(selectedIds.size === usages.length ? new Set() : new Set(usages.map((usage) => usage.id)))}
              />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-20 grid gap-3 border-t border-slate-800 bg-slate-950 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="text-sm text-slate-400">
            {selectedIds.size} of {usages.length} action markers selected
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button className="min-h-11 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" onClick={onClose}>Cancel</button>
            <button className="min-h-11 rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={runPrimaryAction} disabled={primaryDisabled}>
              {loading ? "Loading..." : primaryActionLabel}
            </button>
            <button className="min-h-11 rounded-md bg-teal-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={acceptOverlay} disabled={!selectedIds.size}>
              Add selected to ghost overlay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
