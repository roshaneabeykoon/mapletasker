import { Resend } from "resend";

const DEFAULT_FROM = "MapleTasker <onboarding@resend.dev>";

/** Base URL used to build magic links inside emails. */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function manageUrl(magicToken: string): string {
  return `${appUrl()}/manage/${magicToken}`;
}

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  client ??= new Resend(apiKey);
  return client;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type TaskEmailPayload = {
  name: string;
  email: string;
  category: string;
  location: string;
  magicToken: string;
};

/**
 * Emails the client their magic link. Never throws: a failed send must not roll
 * back a task that was already created, since the link is also shown in the UI.
 */
export async function sendTaskCreatedEmail(task: TaskEmailPayload): Promise<boolean> {
  const resend = getClient();
  const link = manageUrl(task.magicToken);

  if (!resend) {
    console.warn(
      `RESEND_API_KEY is not set; skipping task confirmation email. Manage link: ${link}`,
    );
    return false;
  }

  const { name, category, location } = task;
  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111">
      <h2>Your task is live on MapleTasker</h2>
      <p>Hi ${escapeHtml(name)}, thanks for posting your <strong>${escapeHtml(category)}</strong> task in ${escapeHtml(location)}.</p>
      <p>Use the private link below to edit or delete your task at any time. Anyone with this link can manage your task, so keep it to yourself.</p>
      <p><a href="${link}" style="display:inline-block;background:#b91c1c;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Manage my task</a></p>
      <p style="font-size:12px;color:#555">Or paste this into your browser:<br>${link}</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
    to: task.email,
    subject: "Your MapleTasker task is live — here's your manage link",
    html,
    text: `Hi ${name}, your ${category} task in ${location} is live on MapleTasker.\n\nManage it (edit or delete) with this private link:\n${link}\n\nAnyone with this link can manage your task, so keep it to yourself.`,
  });

  if (error) {
    console.error("Failed to send task confirmation email:", error);
    return false;
  }

  return true;
}
