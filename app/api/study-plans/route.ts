import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateStudyPlan } from "@/lib/ai";
import { z } from "zod";

const GeneratePlanSchema = z.object({
  availableHoursPerDay: z.number().min(1).max(16),
  startDate: z.string().datetime().optional(),
  name: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plans = await prisma.studyPlan.findMany({
      where: { userId: session.user.id },
      include: {
        sessions: {
          include: { topic: { include: { course: true } } },
          orderBy: { scheduledDate: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error("[study-plans GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  try {
    const body = await req.json();
    const parsed = GeneratePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const courses = await prisma.course.findMany({
      where: { userId: session.user.id },
      include: { topics: true },
    });

    if (courses.length === 0) {
      return NextResponse.json(
        { error: "Add courses before generating a study plan" },
        { status: 400 }
      );
    }

    const aiInput = {
      courses: courses.map((c) => ({
        name: c.name,
        examDate: c.examDate.toISOString(),
        topics: c.topics.map((t) => t.name),
        weakTopics: c.topics.filter((t) => t.isWeak).map((t) => t.name),
      })),
      availableHoursPerDay: parsed.data.availableHoursPerDay,
      startDate: parsed.data.startDate
        ? new Date(parsed.data.startDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    };

    const aiResult = await generateStudyPlan(aiInput);

    const plan = await prisma.studyPlan.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name ?? courses[0]?.name ?? "Untitled",
        sessions: {
          create: aiResult.sessions.map((s) => ({
            topicId: courses
              .flatMap((c) => c.topics)
              .find((t) => t.name === s.topic)?.id ?? "",
            scheduledDate: new Date(s.date),
            durationMinutes: s.durationMinutes,
            status: "pending",
          })),
        },
      },
      include: {
        sessions: { include: { topic: true } },
      },
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error) {
    console.error("[study-plans POST]", error);
    return NextResponse.json(
      { error: "Unable to generate study plan. Please try again." },
      { status: 500 }
    );
  }
}
