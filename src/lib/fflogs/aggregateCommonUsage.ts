import { formatTime } from "@/lib/time";
import type { CommonUsageTiming, ExternalActionUsage, UsageConfidence } from "@/lib/common-usage/commonUsageTypes";

function median(values: number[]) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function trimOutliers(group: ExternalActionUsage[]) {
  if (group.length < 5) return group;
  const times = group.map((usage) => usage.timestamp);
  const center = median(times);
  const deviations = times.map((time) => Math.abs(time - center));
  const medianDeviation = median(deviations);
  const allowedDeviation = Math.max(12, medianDeviation * 3);
  return group.filter((usage) => Math.abs(usage.timestamp - center) <= allowedDeviation);
}

export function aggregateCommonUsage(usages: ExternalActionUsage[], encounterTemplateId: string, sampleSize: number): CommonUsageTiming[] {
  const groups = new Map<string, ExternalActionUsage[]>();
  usages.forEach((usage) => {
    const key = [usage.abilityGameId ?? usage.abilityName.toLowerCase(), usage.sourceJob ?? usage.sourceRole ?? "all", usage.matchedTimelineEventId ?? "free"].join(":");
    groups.set(key, [...(groups.get(key) ?? []), usage]);
  });

  const timings: CommonUsageTiming[] = [];
  for (const rawGroup of groups.values()) {
    const group = trimOutliers(rawGroup);
    if (!group.length) continue;
      const times = group.map((usage) => usage.timestamp);
      const medianTime = median(times);
      const earliestTime = Math.min(...times);
      const latestTime = Math.max(...times);
      const spread = latestTime - earliestTime;
      const distinctSamples = new Set(group.map((usage) => `${usage.reportCode ?? "manual"}:${usage.fightId ?? usage.id}`));
      const sampleUsageCount = distinctSamples.size;
      const usageRate = sampleSize ? sampleUsageCount / sampleSize : 1;
      const representative = group[Math.floor(group.length / 2)];
      const confidence: UsageConfidence =
        sampleUsageCount >= Math.min(8, Math.max(3, Math.ceil(sampleSize * 0.18))) && usageRate >= 0.18 && spread <= 12
          ? "high"
          : sampleUsageCount >= Math.min(4, Math.max(2, Math.ceil(sampleSize * 0.08))) && usageRate >= 0.08 && spread <= 28
            ? "medium"
            : "low";
      timings.push({
        id: `common-${representative.abilityId ?? representative.abilityName}-${Math.round(medianTime)}`,
        encounterTemplateId,
        job: representative.sourceJob,
        role: representative.sourceRole,
        abilityGameId: representative.abilityGameId,
        abilityName: representative.abilityName,
        abilityId: representative.abilityId,
        medianTime,
        earliestTime,
        latestTime,
        displayTime: formatTime(medianTime),
        usageCount: group.length,
        sampleSize,
        usageRate,
        nearestEventId: representative.matchedTimelineEventId,
        medianOffsetFromNearestEvent: representative.offsetFromNearestEvent,
        confidence,
        source: "fflogs_aggregate" as const,
        notes: `Common timing seen in ${sampleUsageCount}/${sampleSize} selected fights from ${group.length} matching casts${group.length === rawGroup.length ? "" : ` after filtering ${rawGroup.length - group.length} outlier casts`}.`
      });
  }

  return timings.sort((a, b) => a.medianTime - b.medianTime);
}
