import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const required = ["FFLOGS_CLIENT_ID", "FFLOGS_CLIENT_SECRET", "FFLOGS_API_BASE_URL", "FFLOGS_TOKEN_URL"];

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnvLocal();

let missing = 0;
for (const key of required) {
  const present = Boolean(process.env[key]?.trim());
  console.log(`${key}: ${present ? "present" : "missing"}`);
  if (!present) missing += 1;
}

if (missing > 0) {
  process.exitCode = 1;
}
