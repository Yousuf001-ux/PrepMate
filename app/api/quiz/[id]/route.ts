import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        topic: {
          include: {
            course: { select: { userId: true } },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (quiz.topic.course.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.quiz.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[quiz DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        topic: {
          include: {
            course: {
              select: { userId: true },
            },
          },
        },
        attempts: {
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (quiz.topic.course.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attempt = quiz.attempts[0] ?? null;

    return NextResponse.json({
      data: {
        quizId: quiz.id,
        topic: quiz.topic.name,
        questions: quiz.questions,
        attempt: attempt
          ? {
              answers: attempt.answers,
              score: attempt.score,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[quiz GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
