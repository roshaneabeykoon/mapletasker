import "server-only";

import { prisma } from "@/lib/prisma";

export type RateLimitRule = {
  /** Identifies what is being limited, e.g. `login:email:a@b.co`. */
  key: string;
  /** Attempts allowed inside the window. */
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/**
 * Limits, kept together so they're easy to tune.
 *
 * Login is limited per email *and* per IP: per-email alone lets an attacker
 * rotate IPs, and per-IP alone lets one office behind a single NAT lock each
 * other out. Only failures count, so a legitimate user never hits these.
 */
export const RATE_LIMITS = {
  loginPerEmail: { limit: 5, windowSeconds: 15 * MINUTE },
  loginPerIp: { limit: 20, windowSeconds: 15 * MINUTE },
  signupPerIp: { limit: 5, windowSeconds: HOUR },
  verifyResend: { limit: 3, windowSeconds: HOUR },
  taskPerIp: { limit: 10, windowSeconds: HOUR },
  // Task creation emails the address supplied, so cap per recipient too —
  // otherwise the endpoint is a way to spam someone else's inbox.
  taskPerEmail: { limit: 3, windowSeconds: HOUR },
} as const;

/** Rows older than this are prunable regardless of which window they belong to. */
const MAX_RETENTION_SECONDS = 24 * HOUR;

/**
 * Best-effort client IP. Behind Vercel/proxies the left-most `x-forwarded-for`
 * entry is the caller. It's spoofable when the app is exposed directly, which
 * is why limits never rely on IP alone.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Checks every rule without recording anything. Fails **open**: if the database
 * is unreachable the limiter must not be what takes login down — and in that
 * state the routes it guards can't work anyway.
 */
export async function checkRateLimit(rules: RateLimitRule[]): Promise<RateLimitResult> {
  try {
    for (const rule of rules) {
      const since = new Date(Date.now() - rule.windowSeconds * 1000);
      const count = await prisma.rateLimitHit.count({
        where: { bucket: rule.key, createdAt: { gte: since } },
      });

      if (count < rule.limit) continue;

      const oldest = await prisma.rateLimitHit.findFirst({
        where: { bucket: rule.key, createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      const expiresAt = (oldest?.createdAt.getTime() ?? Date.now()) + rule.windowSeconds * 1000;
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000)),
      };
    }
    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check failed; allowing the request:", error);
    return { allowed: true };
  }
}

export async function recordAttempt(rules: RateLimitRule[]): Promise<void> {
  try {
    await prisma.rateLimitHit.createMany({
      data: rules.map((rule) => ({ bucket: rule.key })),
    });

    // Opportunistic cleanup so the table doesn't grow forever. Cheap enough at
    // this rate that a cron job would be over-engineering.
    if (Math.random() < 0.05) {
      await prisma.rateLimitHit.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - MAX_RETENTION_SECONDS * 1000) } },
      });
    }
  } catch (error) {
    console.error("Failed to record rate limit attempt:", error);
  }
}

/** Wipes counters after a success, so one good login clears earlier fumbles. */
export async function clearAttempts(keys: string[]): Promise<void> {
  try {
    await prisma.rateLimitHit.deleteMany({ where: { bucket: { in: keys } } });
  } catch (error) {
    console.error("Failed to clear rate limit attempts:", error);
  }
}

function humanDelay(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function tooManyRequests(retryAfterSeconds: number, what = "attempts"): Response {
  return Response.json(
    { error: `Too many ${what}. Please try again in ${humanDelay(retryAfterSeconds)}.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
