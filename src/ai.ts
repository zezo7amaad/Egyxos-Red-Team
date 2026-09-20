import { buildSkillPrompt } from "./skills.js";

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
}

export interface AIResponse {
  provider: string;
  model: string;
  text: string;
}

export interface AIProvider {
  name: string;
  generate(request: AIRequest): Promise<AIResponse>;
}

const transientGeminiStatuses = new Set([429, 500, 502, 503, 504]);

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(apiKey = process.env.GEMINI_API_KEY, defaultModel = process.env.GEMINI_MODEL ?? "gemini-3.6-flash") {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required to use the Gemini provider.");
    }

    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const model = request.model ?? this.defaultModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
      },
    });
    let response: Response | undefined;
    let lastDetail = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
      });

      if (response.ok || !transientGeminiStatuses.has(response.status)) {
        break;
      }

      lastDetail = await response.text();
      if (attempt === 2) {
        break;
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 10_000)
        : 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (!response || !response.ok) {
      const detail = lastDetail || (response ? await response.text() : "No response received.");
      const status = response?.status ?? "unknown";
      throw new Error(`Gemini request failed (${status}) after retries: ${detail.slice(0, 500)}`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("Gemini returned no usable text.");
    }

    return { provider: this.name, model, text };
  }
}

export async function askGemini(skillName: string, request: string): Promise<AIResponse> {
  const provider = new GeminiProvider();
  return provider.generate({ prompt: buildSkillPrompt(skillName, request) });
}
