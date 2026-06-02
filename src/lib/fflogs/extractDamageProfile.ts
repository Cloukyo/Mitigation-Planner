import { formatTime } from "@/lib/time";
import { classifySeverity, inferDamageType, inferTargetType } from "@/lib/fflogs/classifyTimelineEvent";
import { normalizeAbilityName } from "@/lib/fflogs/normalizeAbilityName";
import type { DamageProfileEvent, FFLogsEvent } from "@/lib/fflogs/types";

function median(values: number[]) {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function extractDamageProfile(params: {
  reportCode: string;
  fightId: number;
  fightStartTime: number;
  events: FFLogsEvent[];
  groupingWindowSeconds?: number;
}) {
  const groupingWindowMs = (params.groupingWindowSeconds ?? 3) * 1000;
  const groups = new Map<string, FFLogsEvent[]>();

  params.events
    .filter((event) => {
      const amount = event.amount ?? event.unmitigatedAmount ?? 0;
      return amount > 0 && event.targetIsFriendly !== false;
    })
    .forEach((event) => {
      const abilityName = event.ability?.name ?? event.abilityName ?? `Action ${event.abilityGameID ?? event.ability?.gameID ?? "Unknown"}`;
      const abilityKey = event.abilityGameID ?? event.ability?.gameID ?? normalizeAbilityName(abilityName);
      const bucket = Math.round((event.timestamp - params.fightStartTime) / groupingWindowMs);
      const key = `${abilityKey}:${bucket}`;
      groups.set(key, [...(groups.get(key) ?? []), event]);
    });

  return [...groups.entries()].map(([key, events]) => {
    const first = events[0];
    const abilityName = first.ability?.name ?? first.abilityName ?? `Action ${first.abilityGameID ?? first.ability?.gameID ?? "Unknown"}`;
    const values = events.map((event) => event.amount ?? event.unmitigatedAmount ?? 0).filter((value) => value > 0);
    const uniqueTargets = new Set(events.map((event) => event.targetID).filter(Boolean));
    const relativeTime = Math.max(0, Math.round((first.timestamp - params.fightStartTime) / 1000));
    const profileBase = {
      medianDamage: Math.round(median(values)),
      targetCount: uniqueTargets.size,
      wasFatal: events.some((event) => (event.overkill ?? 0) > 0)
    };

    const profile: DamageProfileEvent = {
      id: `damage-${params.reportCode}-${params.fightId}-${key}`,
      reportCode: params.reportCode,
      fightId: params.fightId,
      abilityGameId: first.abilityGameID ?? first.ability?.gameID,
      abilityName,
      timestamp: first.timestamp,
      relativeTime,
      displayTime: formatTime(relativeTime),
      damageType: inferDamageType(first),
      targetCount: uniqueTargets.size,
      hitCount: events.length,
      minDamage: Math.min(...values),
      maxDamage: Math.max(...values),
      medianDamage: profileBase.medianDamage,
      averageDamage: Math.round(values.reduce((total, value) => total + value, 0) / values.length),
      totalDamage: values.reduce((total, value) => total + value, 0),
      overkillCount: events.filter((event) => (event.overkill ?? 0) > 0).length,
      wasFatal: profileBase.wasFatal,
      severity: classifySeverity(profileBase),
      notes: "Observed damage may already include mitigation, shields, gear differences, vuln stacks, deaths, and party-specific conditions."
    };

    return profile;
  });
}
