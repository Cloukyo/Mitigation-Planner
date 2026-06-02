import type { BossTimelineEventCandidate } from "@/lib/fflogs/types";

export function aggregateEncounterTimeline(groups: BossTimelineEventCandidate[][]) {
  const all = groups.flat();
  const grouped = new Map<string, BossTimelineEventCandidate[]>();

  all.forEach((event) => {
    const key = event.abilityGameId ? String(event.abilityGameId) : event.abilityName.toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  });

  return [...grouped.values()]
    .map((events) => {
      const sorted = events.slice().sort((a, b) => a.relativeTime - b.relativeTime);
      const median = sorted[Math.floor(sorted.length / 2)];
      const earliest = sorted[0].relativeTime;
      const latest = sorted[sorted.length - 1].relativeTime;
      return {
        ...median,
        id: `aggregate-${median.abilityGameId ?? median.abilityName}-${median.relativeTime}`,
        confidence: events.length >= Math.max(2, groups.length * 0.75) && latest - earliest <= 10 ? "high" : "medium",
        notes: `Aggregate candidate from ${events.length} selected logs. Timing range ${earliest}s-${latest}s. Needs review.`
      } satisfies BossTimelineEventCandidate;
    })
    .sort((a, b) => a.relativeTime - b.relativeTime);
}
