"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import TaskForm, { type SubmitOutcome, type TaskFormValues } from "@/components/TaskForm";
import type { SerializedTask } from "@/lib/tasks";
import { urgencyLabel } from "@/lib/tasks";

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; task: SerializedTask };

function toFormValues(task: SerializedTask): TaskFormValues {
  return {
    name: task.name,
    email: task.email,
    phone: task.phone ?? "",
    category: task.category,
    urgency: task.urgency,
    location: task.location,
    budget: String(task.budget),
    description: task.description ?? "",
  };
}

export default function ManageTask({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [saved, setSaved] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const endpoint = `/api/tasks/manage/${encodeURIComponent(token)}`;

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch(endpoint);
        if (!active) return;

        if (response.status === 404) {
          setState({ status: "missing" });
          return;
        }
        const payload = await response.json();
        if (!active) return;

        if (!response.ok || !payload.task) {
          setState({ status: "error", message: payload.error ?? "Could not load your task." });
          return;
        }
        setState({ status: "ready", task: payload.task });
      } catch {
        if (active) {
          setState({ status: "error", message: "Couldn't reach the server. Please try again." });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [endpoint]);

  const handleSubmit = useCallback(
    async (values: TaskFormValues): Promise<SubmitOutcome> => {
      setSaved(false);
      setWarning(null);

      let response: Response;
      let payload: {
        task?: SerializedTask;
        warning?: string | null;
        error?: string;
        fields?: Record<string, string>;
      };

      try {
        response = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            phone: values.phone || null,
            category: values.category,
            urgency: values.urgency,
            location: values.location,
            budget: values.budget,
            description: values.description || null,
          }),
        });
        payload = await response.json();
      } catch {
        return { errors: { _: "Couldn't reach the server. Please try again." } };
      }

      if (response.status === 404) {
        setState({ status: "missing" });
        return { errors: { _: "This task no longer exists." } };
      }
      if (!response.ok || !payload.task) {
        return { errors: payload.fields ?? { _: payload.error ?? "Could not save your changes." } };
      }

      setState({ status: "ready", task: payload.task });
      setWarning(payload.warning ?? null);
      setSaved(true);
      return { errors: {} };
    },
    [endpoint],
  );

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const payload = await response.json().catch(() => ({}));
        setDeleteError(payload.error ?? "Could not delete your task.");
        setDeleting(false);
        return;
      }
      setDeleted(true);
    } catch {
      setDeleteError("Couldn't reach the server. Please try again.");
      setDeleting(false);
    }
  }

  if (state.status === "loading") {
    return <p className="text-gray-500">Loading your task…</p>;
  }

  if (deleted) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Task deleted</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Your task has been taken down and taskers can no longer see it. This link no longer
          works.
        </p>
        <p className="mt-6">
          <Link
            href="/post-task"
            className="inline-block rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Post another task
          </Link>
        </p>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Link not found</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This manage link is invalid, or the task it pointed to was deleted.
        </p>
        <p className="mt-6">
          <Link
            href="/post-task"
            className="inline-block rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Post a task
          </Link>
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{state.message}</p>
      </div>
    );
  }

  const { task } = state;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Manage your task</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {task.category} in {task.location} · {urgencyLabel(task.urgency)} · posted{" "}
        {new Date(task.createdAt).toLocaleDateString("en-CA")}
      </p>

      {saved && (
        <p
          role="status"
          className="mt-6 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
        >
          Changes saved.
        </p>
      )}

      {warning && (
        <p
          role="status"
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {warning}
        </p>
      )}

      <div className="mt-8">
        <TaskForm
          key={task.updatedAt}
          initialValues={toFormValues(task)}
          emailMode="readonly"
          submitLabel="Save changes"
          pendingLabel="Saving…"
          onSubmit={handleSubmit}
        />
      </div>

      <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-800">
        <h2 className="text-lg font-semibold">Delete this task</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Taskers will no longer see it, and this link will stop working.
        </p>

        {deleteError && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {deleteError}
          </p>
        )}

        {confirmingDelete ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Delete this task permanently? This can&apos;t be undone.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Yes, delete it"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium transition hover:bg-white disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-950"
              >
                Keep my task
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete task
          </button>
        )}
      </div>
    </div>
  );
}
