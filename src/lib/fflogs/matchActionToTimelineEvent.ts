import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import type { TimelineEvent } from "@/types/planner";

export function matchActionToTimelineEvent<T extends Pick<ExternalActionUsage, "timestamp">>(
  usage: T,
  events: TimelineEvent[],
  windowSeconds = 15
) {
  const candidates = events.filter((event) => event.mitigationRelevant);
  if (!candidates.length) return {};
  const nearest = candidates.reduce((best, event) => (Math.abs(event.time - usage.timestamp) < Math.abs(best.time - usage.timestamp) ? event : best), candidates[0]);
  const offset = Math.round(usage.timestamp - nearest.time);
  if (Math.abs(offset) > windowSeconds) return {};
  return {
    matchedTimelineEventId: nearest.id,
    offsetFromNearestEvent: offset
  };
}
