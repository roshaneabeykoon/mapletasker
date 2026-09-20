import type { Metadata } from "next";
import VerifyEmail from "./VerifyEmail";

export const metadata: Metadata = {
  title: "Verify your email — MapleTasker",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage(props: PageProps<"/verify-email/[token]">) {
  const { token } = await props.params;

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <VerifyEmail token={token} />
    </main>
  );
}
