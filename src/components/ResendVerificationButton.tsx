"use client";

import { useState } from "react";

export default function ResendVerificationButton() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setState("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify-email/resend", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        setState("error");
        setMessage(payload.error ?? "Could not send the verification email.");
        return;
      }

      setState("sent");
    } catch {
      setState("error");
      setMessage("Couldn't reach the server. Please try again.");
    }
  }

  if (state === "sent") {
    return <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Email sent — check your inbox.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={resend}
        disabled={state === "sending"}
        className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-800 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-950/40"
      >
        {state === "sending" ? "Sending…" : "Resend verification email"}
      </button>
      {message && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</p>
      )}
    </div>
  );
}
