"use client";

import { useRouter } from "next/navigation";
import AuthForm, { type AuthOutcome, type Credentials } from "@/components/AuthForm";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();

  async function handleSubmit(credentials: Credentials): Promise<AuthOutcome> {
    let response: Response;
    let payload: { error?: string; fields?: Record<string, string> };

    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      payload = await response.json();
    } catch {
      return { errors: { _: "Couldn't reach the server. Check your connection and try again." } };
    }

    if (!response.ok) {
      return { errors: { _: payload.error ?? "Could not log you in." } };
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <AuthForm
      mode="login"
      submitLabel="Log in"
      pendingLabel="Logging in…"
      onSubmit={handleSubmit}
    />
  );
}
