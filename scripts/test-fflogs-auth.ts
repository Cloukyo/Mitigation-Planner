import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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

function requiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is missing.`);
  }
  return value;
}

async function main() {
  loadDotEnvLocal();

  const clientId = requiredEnv("FFLOGS_CLIENT_ID");
  const clientSecret = requiredEnv("FFLOGS_CLIENT_SECRET");
  const tokenUrl = requiredEnv("FFLOGS_TOKEN_URL");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("FFLogs auth failed: credentials were rejected.");
    }
    throw new Error(`FFLogs auth failed: token endpoint returned HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("FFLogs auth failed: token response did not include an access token.");
  }

  console.log("FFLogs auth: success");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "FFLogs auth failed.";
  console.error(message);
  process.exitCode = 1;
});
