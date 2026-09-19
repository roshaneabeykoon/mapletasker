import type { Metadata } from "next";
import Link from "next/link";
import ManageTask from "./ManageTask";

export const metadata: Metadata = {
  title: "Manage your task — MapleTasker",
  robots: { index: false, follow: false },
};

export default async function ManageTaskPage(props: PageProps<"/manage/[token]">) {
  const { token } = await props.params;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-gray-500 underline underline-offset-4">
        ← Back
      </Link>
      <div className="mt-6">
        <ManageTask token={token} />
      </div>
    </main>
  );
}
