import type { ReportPerformanceBand, ReportSampleCandidate } from "@/lib/common-usage/commonUsageTypes";

function matchesPerformanceBand(candidate: ReportSampleCandidate, band: ReportPerformanceBand) {
  if (band === "any") return true;
  if (candidate.parsePercentile == null) return false;
  if (band === "top_25") return candidate.parsePercentile >= 75;
  return candidate.parsePercentile >= 40 && candidate.parsePercentile <= 60;
}

export function selectReportSamples({
  candidates,
  sampleSize,
  killOnly,
  performanceBand,
  allowFallback = true
}: {
  candidates: ReportSampleCandidate[];
  sampleSize: number;
  killOnly: boolean;
  performanceBand: ReportPerformanceBand;
  allowFallback?: boolean;
}) {
  const hasPercentileMetadata = candidates.some((candidate) => candidate.parsePercentile != null || candidate.percentile != null);
  const effectiveBand = performanceBand === "any" || hasPercentileMetadata || !allowFallback ? performanceBand : "any";
  const seen = new Set<string>();
  return candidates
    .map((candidate) => {
      const key = `${candidate.reportCode}:${candidate.fightId}`;
      if (seen.has(key)) return { ...candidate, included: false, exclusionReason: "Duplicate report/fight." };
      seen.add(key);
      if (killOnly && !candidate.kill) return { ...candidate, included: false, exclusionReason: "Excluded because kill-only is enabled." };
      if ((candidate.duration ?? 0) < 180) return { ...candidate, included: false, exclusionReason: "Excluded because the pull is very short." };
      const percentileCandidate = { ...candidate, parsePercentile: candidate.parsePercentile ?? candidate.percentile };
      if (!matchesPerformanceBand(percentileCandidate, effectiveBand)) {
        return {
          ...candidate,
          included: false,
          exclusionReason:
            effectiveBand === "top_25"
              ? "No top-25% parse metadata was available for this report sample."
              : "No median-parse metadata was available for this report sample."
        };
      }
      return { ...candidate, included: true, performanceBand: effectiveBand };
    })
    .filter((candidate) => candidate.included)
    .slice(0, sampleSize);
}
