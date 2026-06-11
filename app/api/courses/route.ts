import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CreateCourseSchema = z.object({
  name: z.string().min(1).max(100),
  examDate: z.string().datetime(),
  topics: z.array(z.string().min(1).max(100)).min(1).max(50),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const courses = await prisma.course.findMany({
      where: { userId: session.user.id },
      include: { topics: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: courses });
  } catch (error) {
    console.error("[courses GET]", error);
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
    const parsed = CreateCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, examDate, topics } = parsed.data;

    const course = await prisma.course.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        examDate: new Date(examDate),
        topics: {
          create: topics.map((topic) => ({ name: topic.trim() })),
        },
      },
      include: { topics: true },
    });

    return NextResponse.json({ data: course }, { status: 201 });
  } catch (error) {
    console.error("[courses POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
