"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; tokenBalance: number; alreadyVerified: boolean };

export default function VerifyEmail({ token }: { token: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch(`/api/auth/verify-email/${encodeURIComponent(token)}`);
        const payload = await response.json();
        if (!active) return;

        if (!response.ok) {
          setState({ status: "error", message: payload.error ?? "Could not verify your email." });
          return;
        }

        setState({
          status: "success",
          tokenBalance: payload.tasker.tokenBalance,
          alreadyVerified: payload.alreadyVerified,
        });
      } catch {
        if (active) {
          setState({ status: "error", message: "Couldn't reach the server. Please try again." });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === "loading") {
    return <p className="text-gray-500">Verifying your email…</p>;
  }

  if (state.status === "error") {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification failed</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{state.message}</p>
        <p className="mt-6">
          <Link
            href="/tasks"
            className="inline-block rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Go to my account
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {state.alreadyVerified ? "Already verified" : "Email verified"}
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {state.alreadyVerified
          ? "This email was already confirmed."
          : "Your free tokens have been added to your account."}
      </p>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Current balance: <strong>{state.tokenBalance}</strong>{" "}
        {state.tokenBalance === 1 ? "token" : "tokens"}
      </p>
      <p className="mt-6">
        <Link
          href="/tasks"
          className="inline-block rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
        >
          Browse open tasks
        </Link>
      </p>
    </div>
  );
}
