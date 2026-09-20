import type { Metadata } from "next";
import Link from "next/link";
import MagicLinkPanel from "@/components/MagicLinkPanel";
import { manageUrl } from "@/lib/email";

export const metadata: Metadata = {
  title: "Task posted — MapleTasker",
};

export default async function ConfirmationPage(
  props: PageProps<"/post-task/confirmation">,
) {
  const { token, email, redacted } = await props.searchParams;
  const magicToken = typeof token === "string" ? token : "";
  const emailFailed = email === "failed";
  const contactRedacted = redacted === "1";

  if (!magicToken) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Nothing to show</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This page needs a task link. If you were posting a task, please{" "}
          <Link href="/post-task" className="underline underline-offset-4">
            start again
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">Task posted</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">You&apos;re all set</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {emailFailed
          ? "We couldn't send your confirmation email just now, so save this link — it's the only way back to your task."
          : "We've emailed you this link too, but email can take a few minutes. Save it now just in case."}
      </p>

      {contactRedacted && (
        <p
          role="status"
          className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          We removed contact details from your description. Taskers receive your name, email,
          and phone number when they unlock your task — you don&apos;t need to include them.
        </p>
      )}

      <div className="mt-8">
        <MagicLinkPanel url={manageUrl(magicToken)} />
      </div>

      <p className="mt-8 text-sm text-gray-500">
        <Link href="/" className="underline underline-offset-4">
          Back to home
        </Link>
      </p>
    </main>
  );
}
