type TokenState = {
  accessToken: string;
  expiresAt: number;
};

let tokenState: TokenState | null = null;

export function getFFLogsConfig() {
  return {
    clientId: process.env.FFLOGS_CLIENT_ID,
    clientSecret: process.env.FFLOGS_CLIENT_SECRET,
    apiBaseUrl: process.env.FFLOGS_API_BASE_URL ?? "https://www.fflogs.com/api/v2/client",
    tokenUrl: process.env.FFLOGS_TOKEN_URL ?? "https://www.fflogs.com/oauth/token"
  };
}

export async function getFFLogsAccessToken() {
  const config = getFFLogsConfig();
  if (!config.clientId || !config.clientSecret) {
    throw new Error("FFLogs credentials are not configured. Set FFLOGS_CLIENT_ID and FFLOGS_CLIENT_SECRET.");
  }

  if (tokenState && tokenState.expiresAt > Date.now() + 30_000) {
    return tokenState.accessToken;
  }

  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`FFLogs token request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error("FFLogs token response did not include an access token.");
  }

  tokenState = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000
  };
  return tokenState.accessToken;
}
