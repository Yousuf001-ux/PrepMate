import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { simplifySummary } from "@/lib/ai";
import { z } from "zod";

const SimplifySchema = z.object({
  explanation: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = SimplifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const simplified = await simplifySummary(parsed.data.explanation);

    return NextResponse.json({ data: { simplified } });
  } catch (error) {
    console.error("[summarizer simplify POST]", error);
    return NextResponse.json(
      { error: "Unable to simplify. Please try again." },
      { status: 500 }
    );
  }
}
