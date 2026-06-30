import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  status: z.enum(["complete", "missed", "pending"]),
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
    const parsed = UpdateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const sessionRecord = await prisma.studySession.findFirst({
      where: { id, studyPlan: { userId: session.user.id } },
    });

    if (!sessionRecord) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.studySession.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[session PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
