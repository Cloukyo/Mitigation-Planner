import { formatTime } from "@/lib/time";
import { classifySeverity, inferDamageType, inferTargetType, isLikelyMitigationRelevant } from "@/lib/fflogs/classifyTimelineEvent";
import { normalizeAbilityName } from "@/lib/fflogs/normalizeAbilityName";
import type { BossTimelineEventCandidate, DamageProfileEvent, FFLogsEvent } from "@/lib/fflogs/types";

export function extractBossTimeline(params: {
  reportCode: string;
  fightId: number;
  fightStartTime: number;
  events: FFLogsEvent[];
  damageProfile?: DamageProfileEvent[];
}) {
  const byDamageKey = new Map<string, DamageProfileEvent>();
  params.damageProfile?.forEach((profile) => {
    const key = profile.abilityGameId ? String(profile.abilityGameId) : normalizeAbilityName(profile.abilityName);
    byDamageKey.set(key, profile);
  });

  const candidates = params.events
    .filter((event) => {
      const type = event.type ?? "unknown";
      const name = event.ability?.name ?? event.abilityName ?? "";
      const hasName = Boolean(name || event.abilityGameID);
      const isBossish =
        event.sourceIsFriendly === false ||
        event.source?.type === "NPC" ||
        (event.type === "damage" && event.targetIsFriendly !== false);
      const isAutoAttack = normalizeAbilityName(name) === "attack";
      return hasName && isBossish && !isAutoAttack && ["begincast", "cast", "damage", "applydebuff"].includes(type);
    })
    .map((event): BossTimelineEventCandidate => {
      const abilityName = event.ability?.name ?? event.abilityName ?? `Action ${event.abilityGameID ?? event.ability?.gameID ?? "Unknown"}`;
      const abilityGameId = event.abilityGameID ?? event.ability?.gameID;
      const damageKey = abilityGameId ? String(abilityGameId) : normalizeAbilityName(abilityName);
      const profile = byDamageKey.get(damageKey);
      const relativeTime = Math.max(0, Math.round((event.timestamp - params.fightStartTime) / 1000));
      const targetType = inferTargetType(abilityName, profile?.targetCount ?? 0);
      const severity = classifySeverity(profile);
      return {
        id: `candidate-${params.reportCode}-${params.fightId}-${abilityGameId ?? normalizeAbilityName(abilityName)}-${relativeTime}`,
        reportCode: params.reportCode,
        fightId: params.fightId,
        timestamp: event.timestamp,
        relativeTime,
        displayTime: formatTime(relativeTime),
        sourceId: event.sourceID,
        sourceName: event.source?.name,
        abilityGameId,
        abilityName,
        eventType: (event.type as BossTimelineEventCandidate["eventType"]) ?? "unknown",
        targetType,
        damageType: profile?.damageType ?? inferDamageType(event),
        mitigationRelevant: isLikelyMitigationRelevant(abilityName, targetType, severity),
        confidence: event.type === "begincast" || event.type === "cast" ? "high" : "medium",
        source: "fflogs",
        severity,
        observedDamage: profile
          ? {
              sampleSize: profile.hitCount,
              targetCount: profile.targetCount,
              medianDamage: profile.medianDamage,
              averageDamage: profile.averageDamage,
              minDamage: profile.minDamage,
              maxDamage: profile.maxDamage,
              totalDamage: profile.totalDamage,
              wasLikelyMitigated: true,
              warning: "Observed damage may already include mitigation, shields, gear differences, vuln stacks, deaths, and party-specific conditions."
            }
          : undefined,
        notes: profile ? "Observed damage may already include mitigation, shields, gear differences, vuln stacks, deaths, and party-specific conditions." : undefined
      };
    })
    .sort((a, b) => a.relativeTime - b.relativeTime);

  const deduped: BossTimelineEventCandidate[] = [];
  for (const candidate of candidates) {
    const duplicateIndex = deduped.findIndex((existing) => {
      const sameAbility =
        (candidate.abilityGameId && existing.abilityGameId === candidate.abilityGameId) ||
        normalizeAbilityName(existing.abilityName) === normalizeAbilityName(candidate.abilityName);
      return sameAbility && Math.abs(existing.relativeTime - candidate.relativeTime) <= 8;
    });
    if (duplicateIndex === -1) {
      deduped.push(candidate);
      continue;
    }

    const existing = deduped[duplicateIndex];
    const candidateRank = candidate.eventType === "begincast" ? 3 : candidate.eventType === "cast" ? 2 : 1;
    const existingRank = existing.eventType === "begincast" ? 3 : existing.eventType === "cast" ? 2 : 1;
    if (candidateRank > existingRank) {
      deduped[duplicateIndex] = { ...candidate, observedDamage: existing.observedDamage ?? candidate.observedDamage };
    }
  }

  if (deduped.length > 0) {
    return deduped.filter((candidate) => {
      if (candidate.eventType === "damage") {
        return candidate.severity === "high" || candidate.severity === "lethal" || (candidate.observedDamage?.targetCount ?? 0) >= 5;
      }
      return true;
    });
  }

  return (params.damageProfile ?? [])
    .filter((profile) => profile.severity === "high" || profile.severity === "lethal" || profile.targetCount >= 5)
    .map((profile): BossTimelineEventCandidate => ({
      id: `candidate-${profile.id}`,
      reportCode: params.reportCode,
      fightId: params.fightId,
      timestamp: profile.timestamp,
      relativeTime: profile.relativeTime,
      displayTime: profile.displayTime,
      abilityGameId: profile.abilityGameId,
      abilityName: profile.abilityName,
      eventType: "damage",
      targetType: inferTargetType(profile.abilityName, profile.targetCount),
      damageType: profile.damageType,
      mitigationRelevant: true,
      confidence: "medium",
      source: "fflogs",
      severity: profile.severity,
      observedDamage: {
        sampleSize: profile.hitCount,
        targetCount: profile.targetCount,
        medianDamage: profile.medianDamage,
        averageDamage: profile.averageDamage,
        minDamage: profile.minDamage,
        maxDamage: profile.maxDamage,
        totalDamage: profile.totalDamage,
        wasLikelyMitigated: true,
        warning: "Observed damage may already include mitigation, shields, gear differences, vuln stacks, deaths, and party-specific conditions."
      },
      notes: "Damage-derived candidate because no reliable cast event was found. Needs review."
    }));
}
