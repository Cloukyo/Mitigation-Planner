import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

type Ability = {
  id: string;
  iconPath: string;
  iconSourcePath?: string | null;
  missingIcon?: boolean;
};

const root = process.cwd();
const abilitiesPath = path.join(root, "src", "data", "abilities", "abilities.json");
const publicIconDir = path.join(root, "public", "icons", "actions");
const placeholderPath = path.join(publicIconDir, "placeholder.png");
const XIVAPI = "https://v2.xivapi.com/api";

const placeholderPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAjUlEQVR42u3XMQqAMAxE0aT3P7N1cAtCkUUk1gdy7SCDLPwV8YAQAAAAAAAAcF6v2x6o7vX3NhlmTjmZZNo7CZ/P8u6HcJqJZV4A4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4JcA4BcC4t9SGdWTDK1kAAAAAElFTkSuQmCC";

async function ensurePlaceholder() {
  await mkdir(publicIconDir, { recursive: true });
  if (!existsSync(placeholderPath)) {
    await writeFile(placeholderPath, Buffer.from(placeholderPngBase64, "base64"));
  }
}

async function downloadIcon(ability: Ability) {
  if (!ability.iconSourcePath) return false;
  const target = path.join(publicIconDir, `${ability.id}.png`);
  const url = `${XIVAPI}/asset?path=${encodeURIComponent(ability.iconSourcePath)}&format=png`;
  const response = await fetch(url);
  if (!response.ok) return false;
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(target, Buffer.from(arrayBuffer));
  return true;
}

async function main() {
  await ensurePlaceholder();
  const abilities = JSON.parse(await readFile(abilitiesPath, "utf8")) as Ability[];
  let downloaded = 0;
  let missing = 0;

  for (const ability of abilities) {
    try {
      const ok = await downloadIcon(ability);
      if (ok) {
        ability.iconPath = `/icons/actions/${ability.id}.png`;
        ability.missingIcon = false;
        downloaded += 1;
      } else {
        ability.iconPath = "/icons/actions/placeholder.png";
        ability.missingIcon = true;
        missing += 1;
      }
    } catch (error) {
      console.warn(`Icon download failed for ${ability.id}:`, error);
      ability.iconPath = "/icons/actions/placeholder.png";
      ability.missingIcon = true;
      missing += 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  await writeFile(abilitiesPath, `${JSON.stringify(abilities, null, 2)}\n`);
  console.log(`Downloaded ${downloaded} icons. ${missing} abilities use placeholder.png.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
