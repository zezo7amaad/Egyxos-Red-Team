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

  constructor(apiKey = process.env.GEMINI_API_KEY, defaultModel = process.env.GEMINI_MODEL ?? "gemini-2.0-flash") {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required to use the Gemini provider.");
    }

    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const model = request.model ?? this.defaultModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? 0.2,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 500)}`);
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
