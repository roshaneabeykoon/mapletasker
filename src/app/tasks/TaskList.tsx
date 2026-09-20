"use client";

import { useEffect, useState } from "react";
import { UNLOCK_TOKEN_COST, urgencyLabel } from "@/lib/tasks";

/** Exactly what GET /api/tasks exposes — no client contact details. */
type OpenTask = {
  id: string;
  category: string;
  urgency: string;
  location: string;
  budget: number;
  /** Already truncated to a word limit by the API. */
  description: string | null;
  createdAt: string;
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tasks: OpenTask[] };

const urgencyStyles: Record<string, string> = {
  asap: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  this_week: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  this_month: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  flexible: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export default function TaskList() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch("/api/tasks");
        const payload = await response.json();
        if (!active) return;

        if (!response.ok) {
          setState({ status: "error", message: payload.error ?? "Could not load tasks." });
          return;
        }
        setState({ status: "ready", tasks: payload.tasks });
      } catch {
        if (active) {
          setState({ status: "error", message: "Couldn't reach the server. Please try again." });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="text-gray-500">Loading open tasks…</p>;
  }

  if (state.status === "error") {
    return (
      <p
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {state.message}
      </p>
    );
  }

  if (state.tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <p className="font-medium">No open tasks right now</p>
        <p className="mt-1 text-sm text-gray-500">Check back soon — new tasks appear here.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-gray-500">
        {state.tasks.length} open {state.tasks.length === 1 ? "task" : "tasks"}
      </p>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {state.tasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-col rounded-lg border border-gray-200 p-5 dark:border-gray-800"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold">{task.category}</h2>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  urgencyStyles[task.urgency] ?? urgencyStyles.flexible
                }`}
              >
                {urgencyLabel(task.urgency)}
              </span>
            </div>

            {task.description && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {task.description}
              </p>
            )}

            <dl className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-2">
                <dt className="text-gray-500">Location:</dt>
                <dd>{task.location}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500">Budget:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {currency.format(task.budget)}
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-gray-500">
              Posted {new Date(task.createdAt).toLocaleDateString("en-CA")}
            </p>

            {/* mt-auto keeps the buttons aligned across cards of differing heights. */}
            <div className="mt-auto flex items-center gap-3 pt-4">
              <button
                type="button"
                disabled
                title="Unlocking arrives in the next phase"
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Unlock {UNLOCK_TOKEN_COST} {UNLOCK_TOKEN_COST === 1 ? "token" : "tokens"}
              </button>
              <span className="text-xs text-gray-500">coming soon</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
