const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const PLACEHOLDER_KEY_PATTERN = /^(your-|sk-placeholder|placeholder)/i;

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable = false
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  retries = 2
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new DeepSeekError("DEEPSEEK_API_KEY is not configured");
  }

  if (PLACEHOLDER_KEY_PATTERN.test(apiKey)) {
    throw new DeepSeekError(
      "DEEPSEEK_API_KEY appears to be a placeholder. Set your real API key in .env.local."
    );
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        let errorText = "";
        try {
          errorText = await response.text();
        } catch {
          // ignore parse errors on error body
        }

        const retryable = response.status >= 500 || response.status === 429;
        throw new DeepSeekError(
          `DeepSeek API error: ${response.status}${errorText ? ` — ${errorText.slice(0, 200)}` : ""}`,
          response.status,
          retryable
        );
      }

      const data: DeepSeekResponse = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new DeepSeekError("Empty response from DeepSeek");
      }

      return content;
    } catch (error) {
      if (error instanceof DeepSeekError && !error.retryable) {
        throw error;
      }

      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new DeepSeekError("Failed to get response from DeepSeek after all retries");
}
