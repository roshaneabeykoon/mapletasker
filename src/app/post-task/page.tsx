import type { Metadata } from "next";
import Link from "next/link";
import PostTaskForm from "./PostTaskForm";

export const metadata: Metadata = {
  title: "Post a task — MapleTasker",
  description: "Describe your task and get it in front of local taskers. Free to post.",
};

export default function PostTaskPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-gray-500 underline underline-offset-4">
        ← Back
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Post a task</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Free to post. We&apos;ll email you a private link so you can edit or delete your task
        later — no account needed.
      </p>
      <div className="mt-8">
        <PostTaskForm />
      </div>
    </main>
  );
}
