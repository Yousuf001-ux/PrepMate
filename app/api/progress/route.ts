import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalSessions = await prisma.studySession.count({
      where: {
        studyPlan: { userId: session.user.id },
      },
    });

    const completedSessions = await prisma.studySession.count({
      where: {
        studyPlan: { userId: session.user.id },
        status: "complete",
      },
    });

    const missedSessions = await prisma.studySession.count({
      where: {
        studyPlan: { userId: session.user.id },
        status: "missed",
      },
    });

    const pendingSessions = await prisma.studySession.count({
      where: {
        studyPlan: { userId: session.user.id },
        scheduledDate: { gte: today },
        status: "pending",
      },
    });

    const recentSessions = await prisma.studySession.findMany({
      where: {
        studyPlan: { userId: session.user.id },
        scheduledDate: { gte: thirtyDaysAgo },
      },
      include: { topic: true },
      orderBy: { scheduledDate: "desc" },
      take: 20,
    });

    const completionRate = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

    return NextResponse.json({
      data: {
        totalSessions,
        completedSessions,
        missedSessions,
        pendingSessions,
        completionRate,
        recentSessions,
      },
    });
  } catch (error) {
    console.error("[progress GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
