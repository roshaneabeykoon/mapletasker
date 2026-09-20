"use client";

import { useRouter } from "next/navigation";
import AuthForm, { type AuthOutcome, type SubmittedCredentials } from "@/components/AuthForm";

export default function SignupForm({ next }: { next: string }) {
  const router = useRouter();

  async function handleSubmit(credentials: SubmittedCredentials): Promise<AuthOutcome> {
    let response: Response;
    let payload: { error?: string; fields?: Record<string, string> };

    try {
      response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      payload = await response.json();
    } catch {
      return { errors: { _: "Couldn't reach the server. Check your connection and try again." } };
    }

    if (!response.ok) {
      return {
        errors: payload.fields ?? { _: payload.error ?? "Could not create your account." },
      };
    }

    // Signup logs you in, so refresh to pick up the new session cookie.
    router.replace(next);
    router.refresh();
  }

  return (
    <AuthForm
      mode="signup"
      submitLabel="Create account"
      pendingLabel="Creating account…"
      passwordHint="At least 8 characters."
      onSubmit={handleSubmit}
    />
  );
}
