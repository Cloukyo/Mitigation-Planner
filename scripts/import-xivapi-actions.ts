import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ManualAbility = {
  id: string;
  actionId?: number;
  searchName?: string;
  aliases?: string[];
  jobs: string[];
  role: string;
  duration: number;
  mitigationValue?: number | null;
  shieldValue?: number | null;
  healingPotency?: number | null;
  regenPotency?: number | null;
  damageType: string;
  targetType: string;
  effectType: string;
  appliesToRaidwide: boolean;
  appliesToTankbuster: boolean;
  notes?: string;
  needsManualReview?: boolean;
};

type OfficialAction = {
  id: string;
  actionId: number | null;
  name: string;
  description: string | null;
  cooldown: number | null;
  icon: { id?: number; path?: string; path_hr1?: string } | null;
  classJobCategory: Record<string, unknown> | null;
  query: string;
  missingOfficialData?: boolean;
};

const root = process.cwd();
const abilityDir = path.join(root, "src", "data", "abilities");
const manualPath = path.join(abilityDir, "manual-mitigation-metadata.json");
const generatedPath = path.join(abilityDir, "generated-xivapi-actions.json");
const outputPath = path.join(abilityDir, "abilities.json");
const XIVAPI = "https://v2.xivapi.com/api";

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function encodeQuery(name: string) {
  return `Name="${name.replaceAll('"', '\\"')}"`;
}

async function fetchOfficial(manual: ManualAbility): Promise<OfficialAction> {
  const fields = "Name,Description,Recast100ms,Icon,ClassJobCategory";
  const queryName = manual.searchName ?? manual.id;
  const url = `${XIVAPI}/search?sheets=Action&fields=${encodeURIComponent(fields)}&query=${encodeURIComponent(
    encodeQuery(queryName)
  )}&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = (await response.json()) as {
      results?: Array<{
        row_id: number;
        fields?: {
          Name?: string;
          Description?: string;
          Recast100ms?: number;
          Icon?: { id?: number; path?: string; path_hr1?: string };
          ClassJobCategory?: { fields?: Record<string, unknown> };
        };
      }>;
    };
    const result = payload.results?.[0];
    const fieldsResult = result?.fields;

    return {
      id: manual.id,
      actionId: result?.row_id ?? manual.actionId ?? null,
      name: fieldsResult?.Name ?? queryName,
      description: fieldsResult?.Description ?? null,
      cooldown: typeof fieldsResult?.Recast100ms === "number" ? fieldsResult.Recast100ms / 10 : null,
      icon: fieldsResult?.Icon ?? null,
      classJobCategory: fieldsResult?.ClassJobCategory?.fields ?? null,
      query: queryName,
      missingOfficialData: !result
    };
  } catch (error) {
    console.warn(`XIVAPI lookup failed for ${manual.id} (${queryName}):`, error);
    return {
      id: manual.id,
      actionId: manual.actionId ?? null,
      name: queryName,
      description: null,
      cooldown: null,
      icon: null,
      classJobCategory: null,
      query: queryName,
      missingOfficialData: true
    };
  }
}

async function main() {
  await mkdir(abilityDir, { recursive: true });
  const manual = await readJson<ManualAbility[]>(manualPath);
  const generated: OfficialAction[] = [];

  for (const item of manual) {
    generated.push(await fetchOfficial(item));
    await new Promise((resolve) => setTimeout(resolve, 70));
  }

  const generatedById = new Map(generated.map((item) => [item.id, item]));
  const merged = manual.map((item) => {
    const official = generatedById.get(item.id);
    const cooldown = official?.cooldown ?? 0;
    const jobs = item.jobs ?? [];
    return {
      id: item.id,
      actionId: official?.actionId ?? item.actionId ?? null,
      name: official?.name ?? item.searchName ?? item.id,
      aliases: item.aliases ?? [],
      job: jobs.length === 1 ? jobs[0] : "Role",
      jobs,
      role: item.role,
      cooldown,
      duration: item.duration,
      charges: 1,
      mitigationValue: item.mitigationValue ?? null,
      shieldValue: item.shieldValue ?? null,
      healingPotency: item.healingPotency ?? null,
      regenPotency: item.regenPotency ?? null,
      damageType: item.damageType,
      targetType: item.targetType,
      effectType: item.effectType,
      appliesToRaidwide: item.appliesToRaidwide,
      appliesToTankbuster: item.appliesToTankbuster,
      iconPath: `/icons/actions/${item.id}.png`,
      iconSourcePath: official?.icon?.path_hr1 ?? official?.icon?.path ?? null,
      missingIcon: !official?.icon?.path && !official?.icon?.path_hr1,
      missingOfficialData: official?.missingOfficialData ?? false,
      needsManualReview: item.needsManualReview ?? false,
      notes: item.notes,
      description: official?.description,
      source: "xivapi+manual"
    };
  });

  await writeFile(generatedPath, `${JSON.stringify(generated, null, 2)}\n`);
  await writeFile(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Imported ${generated.length} XIVAPI action records and wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
