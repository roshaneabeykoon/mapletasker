import { prisma } from "@/lib/prisma";
import {
  contactWarning,
  redactContactInfo,
  serializeTask,
  validateTaskUpdate,
  type RedactedContact,
} from "@/lib/tasks";

const NOT_FOUND = { error: "No task found for that link." };

/** Soft-deleted tasks are treated as gone, so the magic link stops working. */
async function findLiveTask(magicToken: string) {
  if (!magicToken) return null;
  const task = await prisma.task.findUnique({ where: { magicToken } });
  return task && !task.deletedAt ? task : null;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/tasks/manage/[token]">) {
  const { token } = await ctx.params;

  try {
    const task = await findLiveTask(token);
    if (!task) return Response.json(NOT_FOUND, { status: 404 });

    return Response.json({ task: serializeTask(task) });
  } catch (error) {
    console.error("Failed to load task by magic token:", error);
    return Response.json({ error: "Could not load the task." }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/tasks/manage/[token]">) {
  const { token } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateTaskUpdate(body);
  if (!result.ok) {
    return Response.json(
      { error: "Validation failed.", fields: result.errors },
      { status: 422 },
    );
  }

  // Edits go through the same contact-stripping as the original post.
  const data = { ...result.data };
  let removed: RedactedContact[] = [];
  if ("description" in data) {
    const redacted = redactContactInfo(data.description ?? null);
    data.description = redacted.text;
    removed = redacted.removed;
  }

  try {
    // Possession of the token is the authorization check.
    const existing = await findLiveTask(token);
    if (!existing) return Response.json(NOT_FOUND, { status: 404 });

    const task = await prisma.task.update({
      where: { id: existing.id },
      data,
    });

    return Response.json({ task: serializeTask(task), warning: contactWarning(removed) });
  } catch (error) {
    console.error("Failed to update task:", error);
    return Response.json({ error: "Could not update the task." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/tasks/manage/[token]">) {
  const { token } = await ctx.params;

  try {
    const existing = await findLiveTask(token);
    if (!existing) return Response.json(NOT_FOUND, { status: 404 });

    // Soft delete: keep the row so any unlock history stays intact.
    const task = await prisma.task.update({
      where: { id: existing.id },
      data: { deletedAt: new Date(), status: "cancelled" },
    });

    return Response.json({ task: serializeTask(task) });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return Response.json({ error: "Could not delete the task." }, { status: 500 });
  }
}
