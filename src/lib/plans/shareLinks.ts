import { randomBytes } from "crypto";

const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateShareSlug(length = 10) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function shareUrlForSlug(slug: string, origin?: string) {
  const base = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/plan/${slug}`;
}
