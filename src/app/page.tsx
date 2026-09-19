import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">MapleTasker</h1>
      <p className="max-w-md text-balance text-gray-600 dark:text-gray-400">
        Post household tasks for free. Taskers spend tokens to unlock the leads
        they want.
      </p>
      <Link
        href="/post-task"
        className="rounded-md bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
      >
        Post a task
      </Link>
      <p className="text-sm text-gray-500">
        Health check:{" "}
        <a className="underline underline-offset-4" href="/api/health">
          /api/health
        </a>
      </p>
    </main>
  );
}
