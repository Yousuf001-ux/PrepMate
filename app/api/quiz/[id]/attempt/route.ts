import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const AttemptSchema = z.object({
  answers: z.record(z.string(), z.string()),
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
    const parsed = AttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const questions = quiz.questions as { correctAnswer: string }[];
    let score = 0;

    for (let i = 0; i < questions.length; i++) {
      const userAnswer = parsed.data.answers[i.toString()];
      if (userAnswer === questions[i]?.correctAnswer) {
        score++;
      }
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: id,
        userId: session.user.id,
        score,
        answers: parsed.data.answers,
      },
    });

    return NextResponse.json({
      data: {
        attemptId: attempt.id,
        score,
        total: questions.length,
      },
    });
  } catch (error) {
    console.error("[quiz attempt POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
