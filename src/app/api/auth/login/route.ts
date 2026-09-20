import { validateCredentials, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RATE_LIMITS,
  checkRateLimit,
  clearAttempts,
  clientIp,
  recordAttempt,
  tooManyRequests,
  type RateLimitRule,
} from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

/**
 * A real bcrypt hash (of a random string) compared against when no account
 * exists, so response time doesn't reveal whether an email is registered.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.rQqNVF7dQuLBqzJhVRJwMEeQTBqQGBu";

const INVALID_CREDENTIALS = "Incorrect email or password.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ip = clientIp(request);
  const ipRule: RateLimitRule = { key: `login:ip:${ip}`, ...RATE_LIMITS.loginPerIp };

  const result = validateCredentials(body);
  // Don't leak our password rules on login — a wrong password is just wrong.
  if (!result.ok) {
    await recordAttempt([ipRule]);
    return Response.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const { email, password } = result.data;
  const emailRule: RateLimitRule = { key: `login:email:${email}`, ...RATE_LIMITS.loginPerEmail };
  const rules = [emailRule, ipRule];

  // Checked before the bcrypt compare so guesses can't burn CPU either.
  const limit = await checkRateLimit(rules);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, "login attempts");
  }

  try {
    const tasker = await prisma.tasker.findUnique({
      where: { email },
      select: { id: true, email: true, tokenBalance: true, passwordHash: true },
    });

    const matches = await verifyPassword(password, tasker?.passwordHash ?? DUMMY_HASH);
    if (!tasker || !matches) {
      await recordAttempt(rules);
      return Response.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    // Clear this account's failures, but deliberately NOT the IP bucket:
    // otherwise an attacker could reset their IP limit by logging into an
    // account they own between bursts of guessing.
    await clearAttempts([emailRule.key]);
    await createSession(tasker.id);

    return Response.json({
      tasker: { id: tasker.id, email: tasker.email, tokenBalance: tasker.tokenBalance },
    });
  } catch (error) {
    console.error("Failed to log in tasker:", error);
    return Response.json({ error: "Could not log you in." }, { status: 500 });
  }
}
