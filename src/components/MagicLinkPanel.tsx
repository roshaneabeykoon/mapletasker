"use client";

import { useEffect, useState } from "react";

/** Shows the manage link (built from APP_URL) and lets the client copy it. */
export default function MagicLinkPanel({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium">Your private manage link</p>
      <p className="mt-3 break-all rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-xs dark:border-gray-800 dark:bg-gray-950">
        {url}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition hover:bg-white dark:border-gray-700 dark:hover:bg-gray-950"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={url}
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-800"
        >
          Manage my task
        </a>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Anyone with this link can edit or delete your task. Save it somewhere safe and don&apos;t
        share it.
      </p>
    </div>
  );
}
