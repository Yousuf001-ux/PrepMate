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

/**
 * Calls the DeepSeek API with the provided messages.
 * Includes security checks for placeholders, a 30-second abort timeout,
 * and retry logic with exponential backoff for transient errors.
 *
 * @param messages Array of chat messages in system/user/assistant format.
 * @param retries Number of retry attempts on retryable errors (5xx/429/timeouts). Defaults to 2.
 * @returns The raw string response (usually valid JSON based on request parameters).
 * @throws DeepSeekError if the API key is invalid, missing, or if request fails.
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  retries = 2
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  // Security: Check if API key exists.
  if (!apiKey) {
    throw new DeepSeekError("DEEPSEEK_API_KEY is not configured");
  }

  // Security: Ensure the developer has configured a real key and not a dummy template value.
  if (PLACEHOLDER_KEY_PATTERN.test(apiKey)) {
    throw new DeepSeekError(
      "DEEPSEEK_API_KEY appears to be a placeholder. Set your real API key in .env.local."
    );
  }

  // Retry loop with exponential backoff to handle transient network errors, timeouts, or rate limits.
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash",
          messages,
          // Always ask DeepSeek to reply with JSON for structure parsing in feature modules
          response_format: { type: "json_object" },
        }),
        // Safety: Prevent hanging connections by timing out after 30 seconds
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        let errorText = "";
        try {
          errorText = await response.text();
        } catch {
          // Ignore parsing issues when trying to extract the raw error details
        }

        // 5xx (server error) and 429 (rate limit) are considered retryable.
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
      // If the error is a known DeepSeek API error that isn't transient, don't bother retrying
      if (error instanceof DeepSeekError && !error.retryable) {
        throw error;
      }

      // Retry handler with exponential delay (1s, 2s, 4s...)
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
