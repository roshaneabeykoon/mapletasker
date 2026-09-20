import type { Metadata } from "next";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import ResendVerificationButton from "@/components/ResendVerificationButton";
import { SIGNUP_GRANT, requireTasker } from "@/lib/auth";
import TaskList from "./TaskList";

export const metadata: Metadata = {
  title: "Open tasks — MapleTasker",
  robots: { index: false, follow: false },
};

export default async function TasksPage() {
  // Real auth check against the database. The proxy only does an optimistic
  // cookie check, so this is what actually protects the page.
  const tasker = await requireTasker("/tasks");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-gray-500 underline underline-offset-4">
            ← Back
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Open tasks</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Unlock a task to see the client&apos;s contact details.
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-medium">{tasker.email}</p>
          <p className="mt-1 text-sm text-gray-500">
            {tasker.tokenBalance} {tasker.tokenBalance === 1 ? "token" : "tokens"}
          </p>
          <div className="mt-2">
            <LogoutButton />
          </div>
        </div>
      </div>

      {!tasker.emailVerifiedAt && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Verify your email to receive your {SIGNUP_GRANT} free tokens. Check your inbox for
            the link we sent when you signed up.
          </p>
          <ResendVerificationButton />
        </div>
      )}

      <div className="mt-10">
        <TaskList />
      </div>
    </main>
  );
}
