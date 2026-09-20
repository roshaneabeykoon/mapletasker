import { verifyEmailToken } from "@/lib/auth";
import { createSession } from "@/lib/session";

/**
 * Public by design: a tasker may click this link from a different browser or
 * device than the one they signed up in, so it can't require a session.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/auth/verify-email/[token]">,
) {
  const { token } = await ctx.params;

  try {
    const result = await verifyEmailToken(token);

    if (!result.ok) {
      if (result.reason === "expired") {
        return Response.json(
          { error: "This verification link has expired. Log in and request a new one.", reason: "expired" },
          { status: 410 },
        );
      }
      return Response.json(
        { error: "This verification link is invalid or has already been used.", reason: "invalid" },
        { status: 404 },
      );
    }

    // Logs them in on whatever device they clicked the link from.
    await createSession(result.tasker.id);

    return Response.json({ tasker: result.tasker, alreadyVerified: result.alreadyVerified });
  } catch (error) {
    console.error("Failed to verify email:", error);
    return Response.json({ error: "Could not verify your email." }, { status: 500 });
  }
}
