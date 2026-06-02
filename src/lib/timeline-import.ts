import type { TimelineEvent } from "@/types/planner";
import { formatTime, parseTime } from "@/lib/time";

const damageTypes = ["physical", "magical", "both", "darkness", "unknown"] as const;
const targetTypes = ["party", "tank", "single", "stack", "spread", "mechanic", "unknown"] as const;
const severities = ["low", "medium", "high", "lethal", "unknown"] as const;
const eventTags = ["raidwide", "tankbuster", "bleed", "stack", "spread", "transition", "enrage", "downtime", "unknown"] as const;

function normalize<T extends readonly string[]>(value: string | undefined, allowed: T, fallback: T[number]) {
  const cleaned = value?.trim().toLowerCase();
  return allowed.includes(cleaned ?? "") ? (cleaned as T[number]) : fallback;
}

export function parseTimelineText(text: string): TimelineEvent[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.includes("|")
        ? line.split("|").map((part) => part.trim()).filter(Boolean)
        : line.includes("\t")
          ? line.split("\t").map((part) => part.trim()).filter(Boolean)
          : line.match(/^(\S+)\s+(.+)$/)?.slice(1).map((part) => part.trim()) ?? [line];
      const time = parseTime(parts[0] ?? "");
      const hasLeadingName = time === null && parts.length > 1;
      const resolvedTime = hasLeadingName ? parseTime(parts[1]) : time;
      const name = hasLeadingName ? parts[0] : parts[1] ?? `Imported Event ${index + 1}`;
      const offset = hasLeadingName ? 2 : 2;
      const tag = normalize(parts[offset + 3], eventTags, "unknown");

      return {
        id: `imported-${Date.now()}-${index}`,
        time: resolvedTime ?? index * 30,
        displayTime: formatTime(resolvedTime ?? index * 30),
        name,
        damageType: normalize(parts[offset], damageTypes, "unknown"),
        targetType: normalize(parts[offset + 1], targetTypes, "unknown"),
        severity: normalize(parts[offset + 2], severities, "unknown"),
        eventTag: tag,
        mitigationRelevant: true,
        notes: parts.slice(offset + 4).join(" | ") || undefined,
        source: "local paste import"
      };
    })
    .sort((a, b) => a.time - b.time);
}
