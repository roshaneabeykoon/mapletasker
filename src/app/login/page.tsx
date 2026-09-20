import type { Metadata } from "next";
import Link from "next/link";
import { safeReturnPath } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Tasker log in — MapleTasker",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <Link href="/" className="text-sm text-gray-500 underline underline-offset-4">
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Log in</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        For taskers browsing available work.
      </p>

      <div className="mt-8">
        <LoginForm next={safeReturnPath(next)} />
      </div>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium underline underline-offset-4">
          Sign up
        </Link>
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Posting a task instead?{" "}
        <Link href="/post-task" className="underline underline-offset-4">
          No account needed
        </Link>
      </p>
    </main>
  );
}
