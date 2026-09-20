/**
 * 32 random bytes as URL-safe base64 (43 chars) — unguessable enough to act as
 * a bearer credential on its own (task magic links, email verification links).
 * Uses Web Crypto rather than `node:crypto` so this stays importable from
 * client components.
 */
export function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
