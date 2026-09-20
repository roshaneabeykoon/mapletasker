import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">MapleTasker</h1>
      <p className="max-w-md text-balance text-gray-600 dark:text-gray-400">
        Post household tasks for free. Taskers spend tokens to unlock the leads
        they want.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/post-task"
          className="rounded-md bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
        >
          Post a task
        </Link>
        <Link
          href="/tasks"
          className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          Browse tasks
        </Link>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Are you a tasker?{" "}
        <Link href="/signup" className="font-medium underline underline-offset-4">
          Sign up
        </Link>{" "}
        or{" "}
        <Link href="/login" className="font-medium underline underline-offset-4">
          log in
        </Link>
        .
      </p>
      <p className="text-sm text-gray-500">
        Health check:{" "}
        <a className="underline underline-offset-4" href="/api/health">
          /api/health
        </a>
      </p>
    </main>
  );
}
