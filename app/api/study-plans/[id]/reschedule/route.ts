import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reschedulePlan } from "@/lib/ai";
import { z } from "zod";

const RescheduleSchema = z.object({
  availableHoursPerDay: z.number().min(1).max(16),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  try {
    const body = await req.json();
    const parsed = RescheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const plan = await prisma.studyPlan.findFirst({
      where: { id, userId: session.user.id },
      include: {
        sessions: {
          include: { topic: { include: { course: true } } },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const missedSessions = plan.sessions
      .filter((s) => s.status === "missed")
      .map((s) => ({
        date: s.scheduledDate.toISOString().split("T")[0],
        course: s.topic.course.name,
        topic: s.topic.name,
        durationMinutes: s.durationMinutes,
        priority: s.topic.priority,
      }));

    const remainingSessions = plan.sessions
      .filter((s) => s.status === "pending")
      .map((s) => ({
        date: s.scheduledDate.toISOString().split("T")[0],
        course: s.topic.course.name,
        topic: s.topic.name,
        durationMinutes: s.durationMinutes,
        priority: s.topic.priority,
      }));

    const courseIds = [
      ...new Set(plan.sessions.map((s) => s.topic.courseId)),
    ];
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
    });

    const aiResult = await reschedulePlan({
      missedSessions,
      remainingSessions,
      examDates: courses.map((c) => ({
        course: c.name,
        date: c.examDate.toISOString().split("T")[0],
      })),
      availableHoursPerDay: parsed.data.availableHoursPerDay,
    });

    await prisma.$transaction([
      prisma.studySession.deleteMany({ where: { studyPlanId: id } }),
      prisma.studySession.createMany({
        data: aiResult.sessions.map((s) => ({
          studyPlanId: id,
          topicId: "",
          scheduledDate: new Date(s.date),
          durationMinutes: s.durationMinutes,
          status: "pending",
        })),
      }),
    ]);

    const updatedPlan = await prisma.studyPlan.findUnique({
      where: { id },
      include: {
        sessions: { include: { topic: true }, orderBy: { scheduledDate: "asc" } },
      },
    });

    return NextResponse.json({ data: updatedPlan });
  } catch (error) {
    console.error("[reschedule POST]", error);
    return NextResponse.json(
      { error: "Unable to reschedule plan. Please try again." },
      { status: 500 }
    );
  }
}
