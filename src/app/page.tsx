export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">MapleTasker</h1>
      <p className="max-w-md text-balance text-gray-600 dark:text-gray-400">
        Post household tasks for free. Taskers spend tokens to unlock the leads
        they want.
      </p>
      <p className="text-sm text-gray-500">
        Phase 1 foundation. Health check:{" "}
        <a className="underline underline-offset-4" href="/api/health">
          /api/health
        </a>
      </p>
    </main>
  );
}
