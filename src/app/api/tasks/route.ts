import { getCurrentTasker } from "@/lib/auth";
import { sendTaskCreatedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIp,
  recordAttempt,
  tooManyRequests,
  type RateLimitRule,
} from "@/lib/rate-limit";
import {
  contactWarning,
  generateMagicToken,
  redactContactInfo,
  serializeTask,
  truncateWords,
  validateTaskInput,
} from "@/lib/tasks";

/**
 * The open-task feed for logged-in taskers. The `select` is deliberately narrow:
 * a lead's contact details (name, email, phone) and its magicToken must never
 * reach this endpoint — taskers pay to unlock those in phase 4.
 *
 * The description is sent only as a truncated preview. Clients often type
 * contact details into it, so the full text stays server-side.
 */
export async function GET() {
  const tasker = await getCurrentTasker();
  if (!tasker) {
    return Response.json({ error: "You must be signed in as a tasker." }, { status: 401 });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { status: "open", deletedAt: null },
      select: {
        id: true,
        category: true,
        urgency: true,
        location: true,
        budget: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({
      tasks: tasks.map((task) => ({
        ...task,
        budget: Number(task.budget),
        description: truncateWords(task.description),
        createdAt: task.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to list open tasks:", error);
    return Response.json({ error: "Could not load tasks." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateTaskInput(body);
  if (!result.ok) {
    return Response.json(
      { error: "Validation failed.", fields: result.errors },
      { status: 422 },
    );
  }

  // Limited per IP and per recipient: this route sends mail to whatever address
  // it's given, so an uncapped version is a way to spam a stranger's inbox.
  const rules: RateLimitRule[] = [
    { key: `task:ip:${clientIp(request)}`, ...RATE_LIMITS.taskPerIp },
    { key: `task:email:${result.data.email}`, ...RATE_LIMITS.taskPerEmail },
  ];

  const limit = await checkRateLimit(rules);
  if (!limit.allowed) {
    return tooManyRequests(limit.retryAfterSeconds, "task posts");
  }
  await recordAttempt(rules);

  // Strip contact details out of the description before storing, and tell the
  // client what we took — the stored copy stays clean for every later reader.
  const { text: description, removed } = redactContactInfo(result.data.description);

  try {
    const task = await prisma.task.create({
      data: { ...result.data, description, magicToken: generateMagicToken() },
    });

    const emailSent = await sendTaskCreatedEmail(task);

    return Response.json(
      { task: serializeTask(task), emailSent, warning: contactWarning(removed) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create task:", error);
    return Response.json({ error: "Could not create the task." }, { status: 500 });
  }
}
