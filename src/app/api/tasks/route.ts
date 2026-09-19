import { sendTaskCreatedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { generateMagicToken, serializeTask, validateTaskInput } from "@/lib/tasks";

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

  try {
    const task = await prisma.task.create({
      data: { ...result.data, magicToken: generateMagicToken() },
    });

    const emailSent = await sendTaskCreatedEmail(task);

    return Response.json({ task: serializeTask(task), emailSent }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return Response.json({ error: "Could not create the task." }, { status: 500 });
  }
}
