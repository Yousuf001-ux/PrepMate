import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateSummary } from "@/lib/ai";
import { z } from "zod";

const SummarizerSchema = z.object({
  topic: z.string().min(1).max(500),
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
    const parsed = SummarizerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await generateSummary(parsed.data.topic);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[summarizer POST]", error);
    return NextResponse.json(
      { error: "Unable to generate summary. Please try again." },
      { status: 500 }
    );
  }
}
