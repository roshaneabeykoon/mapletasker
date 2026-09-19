import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [tasks, taskers] = await Promise.all([
      prisma.task.count(),
      prisma.tasker.count(),
    ]);

    return Response.json({
      status: "ok",
      database: "connected",
      counts: { tasks, taskers },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return Response.json(
      {
        status: "error",
        database: "unreachable",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
