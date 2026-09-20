import { createVerificationToken, getCurrentTasker } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { RATE_LIMITS, checkRateLimit, clientIp, recordAttempt, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const tasker = await getCurrentTasker();
  if (!tasker) {
    return Response.json({ error: "You must be signed in as a tasker." }, { status: 401 });
  }

  if (tasker.emailVerifiedAt) {
    return Response.json({ alreadyVerified: true });
  }

  // Keyed on the account and the IP, so one tasker mashing the button and one
  // IP spraying resends across many accounts are both capped.
  const rules = [
    { key: `verify-resend:tasker:${tasker.id}`, ...RATE_LIMITS.verifyResend },
    { key: `verify-resend:ip:${clientIp(request)}`, ...RATE_LIMITS.verifyResend },
  ];

  const limit = await checkRateLimit(rules);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, "verification emails");
  }
  await recordAttempt(rules);

  try {
    const token = await createVerificationToken(tasker.id);
    const emailSent = await sendVerificationEmail({ email: tasker.email, token });
    return Response.json({ emailSent });
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    return Response.json({ error: "Could not send the verification email." }, { status: 500 });
  }
}
