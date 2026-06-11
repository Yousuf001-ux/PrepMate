import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CreateTopicSchema = z.object({
  name: z.string().min(1).max(100),
  priority: z.enum(["high", "medium", "low"]).optional().default("medium"),
  isWeak: z.boolean().optional().default(false),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const course = await prisma.course.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!course) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const topics = await prisma.topic.findMany({
      where: { courseId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: topics });
  } catch (error) {
    console.error("[topics GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const parsed = CreateTopicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const course = await prisma.course.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!course) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const topic = await prisma.topic.create({
      data: {
        courseId: id,
        name: parsed.data.name.trim(),
        priority: parsed.data.priority,
        isWeak: parsed.data.isWeak,
      },
    });

    return NextResponse.json({ data: topic }, { status: 201 });
  } catch (error) {
    console.error("[topics POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
