import { createVerificationToken, hashPassword, validateSignupCredentials } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  recordAttempt,
  tooManyRequests,
  type RateLimitRule,
} from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Every signup attempt counts, valid or not — the point is to stop bulk
  // account creation from one source.
  const ipRule: RateLimitRule = {
    key: `signup:ip:${clientIp(request)}`,
    ...RATE_LIMITS.signupPerIp,
  };

  const limit = await checkRateLimit([ipRule]);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, "signup attempts");
  }
  await recordAttempt([ipRule]);

  const result = validateSignupCredentials(body);
  if (!result.ok) {
    return Response.json(
      { error: "Validation failed.", fields: result.errors },
      { status: 422 },
    );
  }

  const { email, password } = result.data;

  try {
    const existing = await prisma.tasker.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: "That email is already registered.", fields: { email: "That email is already registered." } },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    // No tokens yet — those are granted only once the email is verified, so
    // creating accounts can't be used to farm free unlocks.
    const tasker = await prisma.tasker.create({
      data: { email, passwordHash },
      select: { id: true, email: true, tokenBalance: true, createdAt: true },
    });

    const token = await createVerificationToken(tasker.id);
    const emailSent = await sendVerificationEmail({ email: tasker.email, token });

    await createSession(tasker.id);

    return Response.json(
      {
        tasker: { ...tasker, createdAt: tasker.createdAt.toISOString() },
        emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    // A concurrent signup can still lose the unique-email race above.
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return Response.json({ error: "That email is already registered." }, { status: 409 });
    }
    console.error("Failed to sign up tasker:", error);
    return Response.json({ error: "Could not create your account." }, { status: 500 });
  }
}
