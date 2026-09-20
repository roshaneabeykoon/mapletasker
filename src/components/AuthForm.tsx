"use client";

import { useState } from "react";

export type Credentials = { email: string; password: string };
/** Signup also submits the re-typed password so the server can verify the match. */
export type SubmittedCredentials = Credentials & { confirmPassword?: string };
export type AuthOutcome = { errors?: Record<string, string> } | void;

const fieldClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-red-950";
const labelClass = "block text-sm font-medium mb-1.5";

type Props = {
  mode: "login" | "signup";
  submitLabel: string;
  pendingLabel: string;
  passwordHint?: string;
  onSubmit: (credentials: SubmittedCredentials) => Promise<AuthOutcome>;
};

export default function AuthForm({
  mode,
  submitLabel,
  pendingLabel,
  passwordHint,
  onSubmit,
}: Props) {
  const isSignup = mode === "signup";
  const [values, setValues] = useState({ email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Catch the typo here rather than spending a round trip on it.
    if (isSignup && values.password !== values.confirmPassword) {
      setErrors({ confirmPassword: "Those passwords don't match." });
      return;
    }

    setPending(true);
    setErrors({});

    const outcome = await onSubmit(
      isSignup
        ? { email: values.email, password: values.password, confirmPassword: values.confirmPassword }
        : { email: values.email, password: values.password },
    );
    if (outcome?.errors) {
      setErrors(outcome.errors);
      setPending(false);
    }
    // On success the caller navigates away.
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {errors._ && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {errors._}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={fieldClass}
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          autoComplete="email"
          required
        />
        {errors.email && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className={fieldClass}
          value={values.password}
          onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
        />
        {passwordHint && !errors.password && (
          <p className="mt-1.5 text-xs text-gray-500">{passwordHint}</p>
        )}
        {errors.password && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
        )}
      </div>

      {isSignup && (
        <div>
          <label className={labelClass} htmlFor="confirmPassword">
            Re-enter password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className={fieldClass}
            value={values.confirmPassword}
            onChange={(e) => {
              const confirmPassword = e.target.value;
              setValues((v) => ({ ...v, confirmPassword }));
              // Clear the mismatch warning as soon as they start correcting it.
              setErrors((current) =>
                current.confirmPassword ? { ...current, confirmPassword: "" } : current,
              );
            }}
            autoComplete="new-password"
            required
            aria-invalid={errors.confirmPassword ? true : undefined}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {errors.confirmPassword}
            </p>
          )}
        </div>
      )}

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
