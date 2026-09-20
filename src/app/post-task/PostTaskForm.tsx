"use client";

import { useRouter } from "next/navigation";
import TaskForm, { type SubmitOutcome, type TaskFormValues } from "@/components/TaskForm";

export default function PostTaskForm() {
  const router = useRouter();

  async function handleSubmit(values: TaskFormValues): Promise<SubmitOutcome> {
    let response: Response;
    let payload: {
      task?: { magicToken: string };
      emailSent?: boolean;
      warning?: string | null;
      error?: string;
      fields?: Record<string, string>;
    };

    try {
      response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          phone: values.phone || null,
          description: values.description || null,
        }),
      });
      payload = await response.json();
    } catch {
      return { errors: { _: "Couldn't reach the server. Check your connection and try again." } };
    }

    if (!response.ok || !payload.task) {
      return {
        errors: payload.fields ?? { _: payload.error ?? "Something went wrong. Please try again." },
      };
    }

    const params = new URLSearchParams({ token: payload.task.magicToken });
    if (!payload.emailSent) params.set("email", "failed");
    if (payload.warning) params.set("redacted", "1");
    router.push(`/post-task/confirmation?${params.toString()}`);
  }

  return (
    <TaskForm
      emailMode="editable"
      submitLabel="Post my task"
      pendingLabel="Posting…"
      onSubmit={handleSubmit}
    />
  );
}
