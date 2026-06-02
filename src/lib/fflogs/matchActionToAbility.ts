import abilitiesJson from "@/data/abilities/abilities.json";
import type { Ability } from "@/types/planner";

const abilities = abilitiesJson as unknown as Ability[];

export function normalizeActionName(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const abilityByName = new Map<string, Ability>();
const abilityByGameId = new Map<number, Ability>();

abilities.forEach((ability) => {
  abilityByName.set(normalizeActionName(ability.name), ability);
  ability.aliases?.forEach((alias) => abilityByName.set(normalizeActionName(alias), ability));
  if (ability.actionId) abilityByGameId.set(ability.actionId, ability);
});

export function matchActionToAbility(input: { abilityName?: string; abilityGameId?: number | null }) {
  if (input.abilityGameId) {
    const byId = abilityByGameId.get(input.abilityGameId);
    if (byId) return byId;
  }
  if (!input.abilityName) return undefined;
  return abilityByName.get(normalizeActionName(input.abilityName));
}

export function isMitigationPlanningAbility(ability?: Ability, options?: { includeHealingCooldowns?: boolean; includeSelfMitigation?: boolean }) {
  if (!ability) return false;
  if (ability.effectType === "healing" || ability.effectType === "regen") return Boolean(options?.includeHealingCooldowns);
  if (ability.effectType === "self_mitigation") return Boolean(options?.includeSelfMitigation) || ability.appliesToTankbuster;
  return (
    ability.effectType === "party_mitigation" ||
    ability.effectType === "enemy_debuff" ||
    ability.effectType === "shield" ||
    ability.effectType === "invuln" ||
    ability.appliesToRaidwide ||
    ability.appliesToTankbuster
  );
}
