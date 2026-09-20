import "server-only";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { EMAIL_PATTERN, type ValidationResult } from "@/lib/tasks";
import { generateSecureToken } from "@/lib/tokens";

const BCRYPT_ROUNDS = 12;

/** Free tokens granted once a tasker confirms their email — not at signup. */
export const SIGNUP_GRANT = 3;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt silently truncates beyond 72 bytes, so reject longer input outright. */
export const MAX_PASSWORD_LENGTH = 72;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type Credentials = { email: string; password: string };

export function validateCredentials(body: unknown): ValidationResult<Credentials> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, errors: { _: "Expected a JSON object." } };
  }

  const input = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!EMAIL_PATTERN.test(email)) errors.email = "Please enter a valid email address.";

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_LENGTH) {
    errors.password = `Password must be ${MAX_PASSWORD_LENGTH} bytes or fewer.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { email, password } };
}

/**
 * Signup additionally requires the re-typed password to match. The form checks
 * this too for instant feedback; this is the authoritative check, so a mismatch
 * can't slip through a direct API call.
 */
export function validateSignupCredentials(body: unknown): ValidationResult<Credentials> {
  const result = validateCredentials(body);
  const input = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (confirmPassword !== password) {
    const errors = result.ok ? {} : result.errors;
    return {
      ok: false,
      errors: { ...errors, confirmPassword: "Those passwords don't match." },
    };
  }

  return result;
}

export type CurrentTasker = {
  id: string;
  email: string;
  tokenBalance: number;
  emailVerifiedAt: Date | null;
};

/**
 * The current tasker, verified against the database rather than trusting the
 * cookie alone — so a deleted tasker's still-valid JWT grants nothing. Memoized
 * per render pass so multiple callers share one query.
 */
export const getCurrentTasker = cache(async (): Promise<CurrentTasker | null> => {
  const session = await readSession();
  if (!session) return null;

  try {
    return await prisma.tasker.findUnique({
      where: { id: session.taskerId },
      select: { id: true, email: true, tokenBalance: true, emailVerifiedAt: true },
    });
  } catch (error) {
    console.error("Failed to load the current tasker:", error);
    return null;
  }
});

/**
 * Issues a fresh verification token for a tasker, invalidating any earlier
 * ones so old emails stop working once a new one is sent.
 */
export async function createVerificationToken(taskerId: string): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { taskerId } }),
    prisma.emailVerificationToken.create({ data: { taskerId, token, expiresAt } }),
  ]);

  return token;
}

export type VerifyEmailResult =
  | {
      ok: true;
      alreadyVerified: boolean;
      tasker: { id: string; email: string; tokenBalance: number };
    }
  | { ok: false; reason: "invalid" | "expired" };

/**
 * Redeems a verification token: grants SIGNUP_GRANT exactly once and marks the
 * tasker verified.
 *
 * Reads the row, then deletes it by its own id inside the same transaction and
 * checks the delete actually removed a row before granting anything. Two
 * simultaneous requests with the same token race on that delete — only one
 * can win, so the grant can never be applied twice even under a retry.
 */
export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  if (!token) return { ok: false, reason: "invalid" };

  return prisma.$transaction(async (tx) => {
    const record = await tx.emailVerificationToken.findUnique({
      where: { token },
      include: { tasker: { select: { id: true, email: true, tokenBalance: true, emailVerifiedAt: true } } },
    });
    if (!record) return { ok: false, reason: "invalid" };

    const claimed = await tx.emailVerificationToken.deleteMany({ where: { id: record.id } });
    if (claimed.count === 0) return { ok: false, reason: "invalid" };

    if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };

    // Verifying twice (e.g. a stale second tab) must not grant a second time.
    if (record.tasker.emailVerifiedAt) {
      return { ok: true, alreadyVerified: true, tasker: record.tasker };
    }

    const tasker = await tx.tasker.update({
      where: { id: record.taskerId },
      data: {
        emailVerifiedAt: new Date(),
        tokenBalance: { increment: SIGNUP_GRANT },
      },
      select: { id: true, email: true, tokenBalance: true },
    });

    await tx.walletTransaction.create({
      data: { taskerId: tasker.id, type: "signup_grant", amount: SIGNUP_GRANT },
    });

    return { ok: true, alreadyVerified: false, tasker };
  });
}

/**
 * Sanitizes a `?next=` value before redirecting to it. Anything that isn't a
 * plain in-app path (including protocol-relative `//evil.com`) is discarded, so
 * the login form can't be turned into an open redirect.
 */
export function safeReturnPath(value: unknown, fallback = "/tasks"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/** For pages: sends logged-out visitors to /login. */
export async function requireTasker(returnTo?: string): Promise<CurrentTasker> {
  const tasker = await getCurrentTasker();
  if (!tasker) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }
  return tasker;
}
