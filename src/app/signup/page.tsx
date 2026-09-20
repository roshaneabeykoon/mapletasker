import type { Metadata } from "next";
import Link from "next/link";
import { SIGNUP_GRANT, safeReturnPath } from "@/lib/auth";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Become a tasker — MapleTasker",
};

export default async function SignupPage(props: PageProps<"/signup">) {
  const { next } = await props.searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <Link href="/" className="text-sm text-gray-500 underline underline-offset-4">
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Become a tasker</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Create an account to browse open tasks. Verify your email and you&apos;ll get{" "}
        <strong>{SIGNUP_GRANT} free tokens</strong> to unlock leads.
      </p>

      <div className="mt-8">
        <SignupForm next={safeReturnPath(next)} />
      </div>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Log in
        </Link>
      </p>
    </main>
  );
}
