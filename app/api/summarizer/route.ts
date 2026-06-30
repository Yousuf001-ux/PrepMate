import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateSummary } from "@/lib/ai";
import { prisma } from "@/lib/db";
import { z } from "zod";

const SummarizerSchema = z.object({
  topic: z.string().min(1).max(500),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summaryId = req.nextUrl.searchParams.get("summaryId");
  if (!summaryId) {
    return NextResponse.json({ error: "summaryId is required" }, { status: 400 });
  }

  try {
    const summary = await prisma.summary.findFirst({
      where: { id: summaryId, userId: session.user.id },
    });

    if (!summary) {
      return NextResponse.json({ error: "Summary not found" }, { status: 404 });
    }

    const content = summary.content as { explanation: string; keyConcepts: string[] };
    return NextResponse.json({
      data: {
        id: summary.id,
        title: summary.title,
        explanation: content.explanation,
        keyConcepts: content.keyConcepts ?? [],
      },
    });
  } catch (error) {
    console.error("[summarizer GET]", error);
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
    const parsed = SummarizerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await generateSummary(parsed.data.topic);

    const summary = await prisma.summary.create({
      data: {
        userId: session.user.id,
        title: parsed.data.topic.substring(0, 100),
        content: {
          explanation: result.summary,
          keyConcepts: result.keyConcepts,
        },
      },
    });

    return NextResponse.json({ data: { id: summary.id, explanation: result.summary, keyConcepts: result.keyConcepts, title: parsed.data.topic } });
  } catch (error) {
    console.error("[summarizer POST]", error);
    return NextResponse.json(
      { error: "Unable to generate summary. Please try again." },
      { status: 500 }
    );
  }
}
