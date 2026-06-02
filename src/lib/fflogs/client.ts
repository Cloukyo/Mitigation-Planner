import { getFFLogsAccessToken, getFFLogsConfig } from "@/lib/fflogs/auth";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();
const hitsByIp = new Map<string, { count: number; resetAt: number }>();

export function assertFFLogsRateLimit(ip: string, limit = 24, windowMs = 60_000) {
  const now = Date.now();
  const current = hitsByIp.get(ip);
  if (!current || current.resetAt <= now) {
    hitsByIp.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new Error("FFLogs import rate limit reached. Please wait a minute before trying again.");
  }
}

export async function fflogsGraphQL<T>(query: string, variables: Record<string, unknown>, ttlMs = 5 * 60_000): Promise<T> {
  const cacheKey = JSON.stringify({ query, variables });
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const token = await getFFLogsAccessToken();
  const { apiBaseUrl } = getFFLogsConfig();
  const response = await fetch(apiBaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store"
  });

  if (response.status === 429) {
    throw new Error("FFLogs returned a rate limit response. Please wait before retrying.");
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`FFLogs API request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }
  if (!payload.data) {
    throw new Error("FFLogs API response did not include data.");
  }

  cache.set(cacheKey, { expiresAt: Date.now() + ttlMs, value: payload.data });
  return payload.data;
}
