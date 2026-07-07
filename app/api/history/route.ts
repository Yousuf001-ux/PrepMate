import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { capitalize } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const [studyPlans, summaries, quizzes] = await Promise.all([
      prisma.studyPlan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          sessions: {
            include: { topic: { include: { course: true } } },
            take: 1,
          },
        },
      }),
      prisma.summary.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.quiz.findMany({
        where: { topic: { course: { userId } } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { topic: true },
      }),
    ]);

    const items: {
      id: string;
      type: "study_plan" | "summary" | "quiz";
      title: string;
      href: string;
      createdAt: string;
    }[] = [];

    for (const sp of studyPlans) {
      const label = `Study plan: ${sp.name || sp.sessions[0]?.topic?.course?.name || "Untitled"}`;
      items.push({
        id: sp.id,
        type: "study_plan",
        title: label,
        href: `/study-plan?planId=${sp.id}`,
        createdAt: sp.createdAt.toISOString(),
      });
    }

    for (const s of summaries) {
      items.push({
        id: s.id,
        type: "summary",
        title: `Summarize: ${s.title}`,
        href: `/chatmate?summaryId=${s.id}`,
        createdAt: s.createdAt.toISOString(),
      });
    }

    for (const q of quizzes) {
      const label = capitalize(q.topic?.name ?? "Untitled");
      items.push({
        id: q.id,
        type: "quiz",
        title: `Quiz: ${label}`,
        href: `/chatmate?quiz=${q.id}`,
        createdAt: q.createdAt.toISOString(),
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const top = items.slice(0, 20);

    return NextResponse.json({ data: top });
  } catch (error) {
    console.error("[history GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
