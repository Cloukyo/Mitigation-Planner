import abilitiesJson from "@/data/abilities/abilities.json";
import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import type { Ability, MitigationPlacement, Player } from "@/types/planner";

const abilities = abilitiesJson as unknown as Ability[];

export function suggestedPlayersForUsage(usage: ExternalActionUsage, players: Player[]) {
  const ability = abilities.find((item) => item.id === usage.abilityId);
  if (!ability) return [];
  const exact = players.filter((player) => {
    const jobMatches = ability.jobs?.includes(player.job) || ability.job === player.job || ability.job === "Role";
    const roleMatches = ability.role === "role" || ability.role === player.role;
    return jobMatches && roleMatches;
  });
  if (exact.length > 0) return exact;

  const shieldHealerJobs = new Set(["SCH", "SGE"]);
  const pureHealerJobs = new Set(["WHM", "AST"]);
  if (usage.sourceJob && shieldHealerJobs.has(usage.sourceJob)) {
    const shieldRows = players.filter((player) => player.name.toLowerCase().includes("shield") || shieldHealerJobs.has(player.job));
    if (shieldRows.length > 0) return shieldRows;
  }
  if (usage.sourceJob && pureHealerJobs.has(usage.sourceJob)) {
    const pureRows = players.filter((player) => player.name.toLowerCase().includes("pure") || pureHealerJobs.has(player.job));
    if (pureRows.length > 0) return pureRows;
  }

  if (usage.sourceRole) {
    const roleRows = players.filter((player) => player.role === usage.sourceRole);
    if (roleRows.length > 0) return roleRows;
  }

  return players.filter((player) => player.role === ability.role);
}

export function hasDuplicateUsagePlacement(usage: ExternalActionUsage, playerId: string, placements: MitigationPlacement[]) {
  if (!usage.abilityId) return false;
  return placements.some((placement) => placement.playerId === playerId && placement.abilityId === usage.abilityId && Math.abs(placement.time - usage.timestamp) <= 2);
}
