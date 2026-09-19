"use client";

import { useState } from "react";
import { TASK_CATEGORIES, TASK_URGENCIES } from "@/lib/tasks";

export type TaskFormValues = {
  name: string;
  email: string;
  category: string;
  urgency: string;
  location: string;
  budget: string;
  description: string;
};

export type SubmitOutcome = { errors?: Record<string, string> } | void;

const EMPTY_VALUES: TaskFormValues = {
  name: "",
  email: "",
  category: "",
  urgency: "",
  location: "",
  budget: "",
  description: "",
};

const fieldClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-red-950";
const labelClass = "block text-sm font-medium mb-1.5";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{message}</p>;
}

type Props = {
  initialValues?: Partial<TaskFormValues>;
  /** Email is only set at creation time — it's where the magic link was sent. */
  emailMode: "editable" | "readonly";
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (values: TaskFormValues) => Promise<SubmitOutcome>;
};

export default function TaskForm({
  initialValues,
  emailMode,
  submitLabel,
  pendingLabel,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<TaskFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function update<K extends keyof TaskFormValues>(field: K, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});

    const outcome = await onSubmit(values);
    if (outcome?.errors) {
      setErrors(outcome.errors);
      setPending(false);
      return;
    }
    // On success the caller navigates away, so leave the button disabled.
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {errors._ && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {errors._}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          name="name"
          className={fieldClass}
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          autoComplete="name"
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        {emailMode === "editable" ? (
          <>
            <input
              id="email"
              name="email"
              type="email"
              className={fieldClass}
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              We&apos;ll email you a private link to manage this task.
            </p>
          </>
        ) : (
          <>
            <input id="email" className={`${fieldClass} opacity-60`} value={values.email} disabled />
            <p className="mt-1.5 text-xs text-gray-500">
              Your email can&apos;t be changed — it&apos;s where this link was sent.
            </p>
          </>
        )}
        <FieldError message={errors.email} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="category">
            Category
          </label>
          <select
            id="category"
            name="category"
            className={fieldClass}
            value={values.category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">Choose one…</option>
            {TASK_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <FieldError message={errors.category} />
        </div>

        <div>
          <label className={labelClass} htmlFor="urgency">
            How soon?
          </label>
          <select
            id="urgency"
            name="urgency"
            className={fieldClass}
            value={values.urgency}
            onChange={(e) => update("urgency", e.target.value)}
          >
            <option value="">Choose one…</option>
            {TASK_URGENCIES.map((urgency) => (
              <option key={urgency.value} value={urgency.value}>
                {urgency.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.urgency} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            className={fieldClass}
            placeholder="Toronto, ON"
            value={values.location}
            onChange={(e) => update("location", e.target.value)}
          />
          <FieldError message={errors.location} />
        </div>

        <div>
          <label className={labelClass} htmlFor="budget">
            Budget (CAD)
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            min="1"
            step="0.01"
            inputMode="decimal"
            className={fieldClass}
            placeholder="120"
            value={values.budget}
            onChange={(e) => update("budget", e.target.value)}
          />
          <FieldError message={errors.budget} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Description <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          className={fieldClass}
          placeholder="What needs doing? Include any details a tasker should know."
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
        />
        <FieldError message={errors.description} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
