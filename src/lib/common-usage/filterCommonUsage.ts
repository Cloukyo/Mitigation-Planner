import abilitiesJson from "@/data/abilities/abilities.json";
import type { ExternalActionUsage, CommonUsageLayer } from "@/lib/common-usage/commonUsageTypes";
import type { Ability } from "@/types/planner";

const abilities = abilitiesJson as unknown as Ability[];

export function filterCommonUsage(usages: ExternalActionUsage[], layer?: CommonUsageLayer) {
  if (!layer?.enabled) return [];
  const filters = layer.filters;
  return usages.filter((usage) => {
    if (usage.importStatus === "ignored") return false;
    if (filters.jobs?.length && (!usage.sourceJob || !filters.jobs.includes(usage.sourceJob))) return false;
    if (filters.roles?.length && (!usage.sourceRole || !filters.roles.includes(usage.sourceRole))) return false;
    if (filters.confidence?.length && !filters.confidence.includes(usage.confidence)) return false;
    if (filters.sources?.length && !filters.sources.includes(usage.source)) return false;
    if (!filters.showUnmatched && !usage.abilityId) return false;
    const ability = abilities.find((item) => item.id === usage.abilityId);
    if (ability) {
      const isHealing = ability.effectType === "healing" || ability.effectType === "regen";
      const isSelf = ability.effectType === "self_mitigation";
      const isRole = ability.role === "role";
      if (isHealing && !filters.showHealingCooldowns) return false;
      if (isSelf && !filters.showSelfMitigation) return false;
      if (ability.role === "tank" && !filters.showTankCooldowns) return false;
      if (isRole && !filters.showRoleMitigation) return false;
    }
    if (filters.mitigationOnly) {
      if (!ability) return false;
      return ability.appliesToRaidwide || ability.appliesToTankbuster || ability.effectType !== "utility";
    }
    return true;
  });
}
