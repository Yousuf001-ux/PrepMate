import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateTopicSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  isWeak: z.boolean().optional(),
});

export async function PATCH(
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
    const parsed = UpdateTopicSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const topic = await prisma.topic.findFirst({
      where: { id, course: { userId: session.user.id } },
    });

    if (!topic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.topic.update({
      where: { id },
      data: {
        ...(parsed.data.name && { name: parsed.data.name.trim() }),
        ...(parsed.data.priority && { priority: parsed.data.priority }),
        ...(parsed.data.isWeak !== undefined && { isWeak: parsed.data.isWeak }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[topic PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const topic = await prisma.topic.findFirst({
      where: { id, course: { userId: session.user.id } },
    });

    if (!topic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.topic.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[topic DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
