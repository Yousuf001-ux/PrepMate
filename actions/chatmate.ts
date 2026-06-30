"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { chatmate } from "@/lib/ai/chatmate";

export async function sendChatMessage(
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" };
  }

  try {
    const result = await chatmate(message, history);
    return { success: true as const, data: result };
  } catch (error) {
    console.error("[chatmate]", error);
    const messageText =
      error instanceof Error
        ? error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")
          ? "We couldn't reach the AI service. Check your internet connection and try again."
          : error.message.includes("429") || error.message.includes("rate limit")
          ? "The AI service is busy right now. Give it a moment and try again."
          : error.message.includes("timeout") || error.message.includes("timed out")
          ? "The AI took too long to respond. Please try again."
          : /placeholder|API_KEY|apiKey|secret/i.test(error.message)
          ? "The AI service isn't configured yet. Contact the admin to set it up."
          : "Something went wrong. Try again."
        : "An unexpected issue came up. Try again.";
    return { success: false as const, error: messageText };
  }
}
