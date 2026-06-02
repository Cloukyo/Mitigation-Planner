import type { Ability, Encounter, MitigationPlacement, Player, TimelineEvent, Warning } from "@/types/planner";

export function getAbility(abilities: Ability[], abilityId: string) {
  return abilities.find((ability) => ability.id === abilityId);
}

export function isActiveAtEvent(ability: Ability, placement: MitigationPlacement, event: TimelineEvent) {
  return placement.time <= event.time && placement.time + ability.duration >= event.time;
}

export function isDamageTypeMismatch(ability: Ability, event: TimelineEvent) {
  if (event.damageType === "unknown" || ability.damageType === "unknown" || ability.damageType === "both") {
    return false;
  }

  if (event.damageType === "darkness") {
    return true;
  }

  return ability.damageType !== event.damageType;
}

export function activePlacementsForEvent(
  abilities: Ability[],
  placements: MitigationPlacement[],
  event: TimelineEvent
) {
  return placements.filter((placement) => {
    const ability = getAbility(abilities, placement.abilityId);
    return ability ? isActiveAtEvent(ability, placement, event) : false;
  });
}

export function buildWarnings(
  abilities: Ability[],
  players: Player[],
  encounter: Encounter,
  placements: MitigationPlacement[]
): Warning[] {
  const warnings: Warning[] = [];

  const byPlayerAndAbility = new Map<string, MitigationPlacement[]>();
  placements.forEach((placement) => {
    const key = `${placement.playerId}:${placement.abilityId}`;
    byPlayerAndAbility.set(key, [...(byPlayerAndAbility.get(key) ?? []), placement]);
  });

  byPlayerAndAbility.forEach((group) => {
    const sorted = group.slice().sort((a, b) => a.time - b.time);
    sorted.forEach((placement, index) => {
      if (index === 0) return;
      const previous = sorted[index - 1];
      const ability = getAbility(abilities, placement.abilityId);
      if (!ability) return;

      const readyAt = previous.time + ability.cooldown;
      if (placement.time < readyAt) {
        const player = players.find((item) => item.id === placement.playerId);
        warnings.push({
          id: `cooldown-${placement.id}`,
          severity: "danger",
          title: "Cooldown conflict",
          detail: `${ability.name} on ${player?.name ?? placement.playerId} is reused ${Math.round(
            readyAt - placement.time
          )}s early.`,
          placementId: placement.id
        });
      }
    });
  });

  encounter.events
    .filter((event) => event.mitigationRelevant)
    .forEach((event) => {
      const active = activePlacementsForEvent(abilities, placements, event);
      const useful = active.filter((placement) => {
        const ability = getAbility(abilities, placement.abilityId);
        return ability && !isDamageTypeMismatch(ability, event);
      });

      if ((event.severity === "high" || event.severity === "lethal") && useful.length === 0) {
        warnings.push({
          id: `uncovered-${event.id}`,
          severity: event.severity === "lethal" ? "danger" : "warning",
          title: "Uncovered event",
          detail: `${event.displayTime} ${event.name} has no applicable active mitigation.`,
          eventId: event.id
        });
      }

      active.forEach((placement) => {
        const ability = getAbility(abilities, placement.abilityId);
        if (!ability || !isDamageTypeMismatch(ability, event)) return;

        warnings.push({
          id: `mismatch-${placement.id}-${event.id}`,
          severity: "warning",
          title: "Damage type mismatch",
          detail: `${ability.name} does not apply cleanly to ${event.name} (${event.damageType}).`,
          placementId: placement.id,
          eventId: event.id
        });
      });

      if (useful.length >= 5) {
        warnings.push({
          id: `overstack-${event.id}`,
          severity: "info",
          title: "Possible overstack",
          detail: `${event.displayTime} ${event.name} has ${useful.length} applicable mitigations active.`,
          eventId: event.id
        });
      }
    });

  return warnings;
}
