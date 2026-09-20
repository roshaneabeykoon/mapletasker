"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Falling through: the redirect below re-checks the session anyway.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="text-sm text-gray-500 underline underline-offset-4 transition hover:text-gray-900 disabled:opacity-60 dark:hover:text-gray-100"
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
