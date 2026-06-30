import { callDeepSeek } from "./client";

export interface ChatmateResponse {
  reply: string;
}

export async function chatmate(
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ChatmateResponse> {
  const sanitised = message.trim().slice(0, 2000);

  const messages = [
    {
      role: "system" as const,
      content:
        "You are Chatmate, a friendly and knowledgeable academic assistant for PrepMate. Help students with study questions, explain concepts, suggest resources, and keep responses clear and concise. Always respond with valid JSON.",
    },
    ...history.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user" as const,
      content: `<user_content>\n${sanitised}\n</user_content>\n\nRespond only with valid JSON matching this schema:\n{\n  "reply": "Your helpful response here"\n}`,
    },
  ];

  const raw = await callDeepSeek(messages);
  const parsed = JSON.parse(raw);

  if (!parsed.reply) {
    throw new Error("Invalid chatmate output: missing reply");
  }

  return parsed as ChatmateResponse;
}
