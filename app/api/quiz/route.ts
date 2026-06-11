import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateQuiz } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { z } from "zod";

const QuizSchema = z.object({
  topic: z.string().min(1).max(500),
  numQuestions: z.number().min(3).max(20).optional().default(5),
  topicId: z.string().uuid().optional(),
});

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
    const parsed = QuizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await generateQuiz({
      topic: parsed.data.topic,
      numQuestions: parsed.data.numQuestions,
    });

    let quizRecord = null;
    if (parsed.data.topicId) {
      quizRecord = await prisma.quiz.create({
        data: {
          topicId: parsed.data.topicId,
          questions: result.questions,
        },
      });
    }

    return NextResponse.json({ data: { ...result, id: quizRecord?.id } });
  } catch (error) {
    console.error("[quiz POST]", error);
    return NextResponse.json(
      { error: "Unable to generate quiz. Please try again." },
      { status: 500 }
    );
  }
}
