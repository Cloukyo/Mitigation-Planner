import type { DamageProfileEvent, FFLogsEvent } from "@/lib/fflogs/types";
import type { DamageType, EventTarget, Severity } from "@/types/planner";

const tankbusterHints = ["buster", "cleave", "strike", "slash", "punch", "crush", "rend"];
const raidwideHints = ["raid", "glory", "ultimate", "enrage", "wave", "sky", "holy", "flare", "explosion", "cataclysm", "apocalypse"];
const stackHints = ["stack", "share", "soak"];
const spreadHints = ["spread", "protean"];
const bleedHints = ["bleed", "dot", "wound", "burn"];

export function inferDamageType(event: FFLogsEvent): DamageType {
  const type = event.ability?.type;
  if (type === 1) return "physical";
  if (type === 2 || type === 4 || type === 8 || type === 16) return "magical";
  return "unknown";
}

export function inferTargetType(name: string, targetCount = 0): EventTarget {
  const normalized = name.toLowerCase();
  if (stackHints.some((hint) => normalized.includes(hint))) return "stack";
  if (spreadHints.some((hint) => normalized.includes(hint))) return "spread";
  if (targetCount >= 5 || raidwideHints.some((hint) => normalized.includes(hint))) return "party";
  if (tankbusterHints.some((hint) => normalized.includes(hint))) return "tank";
  if (targetCount === 1) return "single";
  return "unknown";
}

export function classifySeverity(profile?: Pick<DamageProfileEvent, "medianDamage" | "targetCount" | "wasFatal">): Severity {
  if (!profile) return "unknown";
  if (profile.wasFatal || profile.medianDamage >= 250_000) return "lethal";
  if (profile.targetCount >= 5 || profile.medianDamage >= 120_000) return "high";
  if (profile.medianDamage >= 45_000) return "medium";
  return "low";
}

export function isLikelyMitigationRelevant(name: string, targetType: EventTarget, severity: Severity) {
  const normalized = name.toLowerCase();
  if (severity === "high" || severity === "lethal") return true;
  if (targetType === "party" || targetType === "tank" || targetType === "stack") return true;
  if (bleedHints.some((hint) => normalized.includes(hint))) return true;
  return false;
}
