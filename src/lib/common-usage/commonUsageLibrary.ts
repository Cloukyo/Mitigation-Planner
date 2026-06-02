import type { CommonUsageLibraryEntry, ReportPerformanceBand } from "@/lib/common-usage/commonUsageTypes";

export const COMMON_USAGE_LIBRARY_KEY = "mitigation-planner-common-usage-library-v1";
export const COMMON_USAGE_LIBRARY_UPDATED_EVENT = "common-usage-library-updated";

export function performanceBandLabel(band: ReportPerformanceBand) {
  if (band === "top_25") return "Top 25% parses";
  if (band === "median") return "Median parses";
  return "Any public logs";
}

export function performanceBandDescription(band: ReportPerformanceBand) {
  if (band === "top_25") return "Prefer logs with parse percentile metadata at 75th percentile or higher.";
  if (band === "median") return "Prefer logs near the middle parse range when percentile metadata is available.";
  return "Use neutral public report samples without parse-band filtering.";
}

export function readCommonUsageLibrary(): CommonUsageLibraryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(COMMON_USAGE_LIBRARY_KEY) ?? "[]") as CommonUsageLibraryEntry[];
  } catch {
    return [];
  }
}

export function saveCommonUsageLibraryEntry(entry: CommonUsageLibraryEntry) {
  if (typeof window === "undefined") return;
  const entries = readCommonUsageLibrary();
  const next = [entry, ...entries.filter((item) => item.id !== entry.id)];
  window.localStorage.setItem(COMMON_USAGE_LIBRARY_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(COMMON_USAGE_LIBRARY_UPDATED_EVENT));
}
