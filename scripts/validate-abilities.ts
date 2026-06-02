import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Ability = {
  id?: string;
  actionId?: number | null;
  name?: string;
  job?: string;
  jobs?: string[];
  aliases?: string[];
  role?: string;
  cooldown?: number;
  duration?: number;
  mitigationValue?: number | null;
  damageType?: string;
  targetType?: string;
  effectType?: string;
  iconPath?: string;
  missingIcon?: boolean;
};

const root = process.cwd();
const abilitiesPath = path.join(root, "src", "data", "abilities", "abilities.json");
const keyAbilityIds = [
  "reprisal",
  "addle",
  "feint",
  "kerachole",
  "sacred-soil",
  "troubadour",
  "tactician",
  "shield-samba",
  "shake-it-off",
  "divine-veil",
  "dark-missionary",
  "heart-of-light",
  "temperance",
  "panhaima",
  "holos",
  "magick-barrier"
];

function iconExists(iconPath: string) {
  const relative = iconPath.replace(/^\//, "");
  return existsSync(path.join(root, "public", relative));
}

async function main() {
  const abilities = JSON.parse(await readFile(abilitiesPath, "utf8")) as Ability[];
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  const actionIds = new Map<number, string>();

  for (const ability of abilities) {
    const label = ability.id ?? ability.name ?? "(unknown)";
    if (!ability.id) errors.push(`${label}: missing id`);
    if (!ability.name) errors.push(`${label}: missing name`);
    if (!ability.job && !ability.jobs?.length) errors.push(`${label}: missing job/jobs`);
    if (!ability.role) errors.push(`${label}: missing role`);
    if (typeof ability.cooldown !== "number" || ability.cooldown < 0) errors.push(`${label}: missing cooldown`);
    if ((typeof ability.duration !== "number" || ability.duration < 0) && ability.effectType !== "healing" && ability.effectType !== "utility") {
      errors.push(`${label}: missing duration`);
    }
    if (!ability.damageType) errors.push(`${label}: missing damageType`);
    if (!ability.targetType) errors.push(`${label}: missing targetType`);
    if (!ability.effectType) errors.push(`${label}: missing effectType`);
    if (!ability.iconPath) {
      errors.push(`${label}: missing iconPath`);
    } else if (!iconExists(ability.iconPath)) {
      warnings.push(`${label}: icon file missing at ${ability.iconPath}`);
    }
    if (ability.missingIcon) warnings.push(`${label}: marked missingIcon and using placeholder`);
    if (typeof ability.mitigationValue === "number" && (ability.mitigationValue < 0 || ability.mitigationValue > 1)) {
      errors.push(`${label}: mitigationValue must be between 0 and 1`);
    }
    if (ability.id) {
      if (ids.has(ability.id)) errors.push(`${label}: duplicate id`);
      ids.add(ability.id);
    }
    if (ability.actionId) {
      const existing = actionIds.get(ability.actionId);
      if (existing && !ability.aliases?.includes(existing)) {
        warnings.push(`${label}: duplicate actionId ${ability.actionId} also used by ${existing}`);
      }
      actionIds.set(ability.actionId, ability.id ?? label);
    }
  }

  for (const key of keyAbilityIds) {
    if (!ids.has(key)) errors.push(`Missing key ability: ${key}`);
  }

  console.log(`Validated ${abilities.length} abilities.`);
  if (warnings.length) {
    console.warn(`Warnings (${warnings.length}):`);
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }
  if (errors.length) {
    console.error(`Errors (${errors.length}):`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  console.log("Ability validation passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
