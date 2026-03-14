import { Injectable } from "@nestjs/common";

export interface DetectedProductDraft {
  name: string;
  description: string;
  category?: string;
  stoneColors?: string[];
  model?: string | null;
}

const EXTRACT_PRODUCTS_PROMPT = `You are analyzing a photo of jewellery. The image may contain ear rings, necklaces, or other pieces.

Your task:
1. Identify EVERY distinct jewellery item visible.
2. For each item provide: "name", "category", "description", "stone_colors", "model".

Required for each product:
- "name": Short product name (e.g. "Gold Chain Necklace").
- "category": One of "Ear rings", "Necklaces", or with material: "Necklaces - Gold", "Necklaces - Stone", "Necklaces - Metal", "Necklaces - Silver", "Ear rings - Gold", "Ear rings - Silver", etc.
- "description": 1–2 sentence description including material/style.
- "stone_colors": **Always include this**. Array of stone/gem colors you see on the piece. Look at the image for any gems, stones, or colored accents. Use color names like "red", "blue", "emerald", "sapphire", "black", "white", "multi" etc. Use [] only if the piece clearly has no stones/gems.
- "model": Alphanumeric code if visible on the piece or tag (e.g. "JR-401", "NC-102"); otherwise null.

Return a JSON object with a single key "products" whose value is an array of objects. Every object must have: "name", "description", "category", "stone_colors" (array, never omit), "model" (string or null). Use only valid JSON, no markdown or explanation.

Example: {"products":[{"name":"Gold Rope Chain","description":"Elegant gold rope chain necklace.","category":"Necklaces - Gold","stone_colors":[],"model":"NC-102"},{"name":"Ruby Stud Earrings","description":"Stud ear rings with ruby.","category":"Ear rings - Stone","stone_colors":["red"],"model":null},{"name":"Sapphire Pendant","description":"Silver pendant with blue stone.","category":"Necklaces - Silver","stone_colors":["blue","sapphire"],"model":null}]}

List every different jewellery item you can see. Always include "stone_colors" for each item.`;

function normalizeDraft(p: Record<string, unknown>): DetectedProductDraft {
  const stoneColors = Array.isArray(p.stone_colors)
    ? (p.stone_colors as unknown[]).map((c) => String(c).trim()).filter(Boolean)
    : Array.isArray(p.stoneColors)
      ? (p.stoneColors as unknown[]).map((c) => String(c).trim()).filter(Boolean)
      : undefined;
  const modelRaw = p.model;
  const model =
    modelRaw === null || modelRaw === undefined
      ? null
      : typeof modelRaw === "string" && modelRaw.trim()
        ? modelRaw.trim()
        : null;
  return {
    name: String(p.name ?? "Detected product").trim() || "Detected product",
    description: String(p.description ?? "Product detected from image.").trim(),
    category: typeof p.category === "string" ? p.category.trim() : undefined,
    stoneColors: stoneColors?.length ? stoneColors : undefined,
    model: model ?? undefined,
  };
}

function extractProductsFromResponse(raw: string): DetectedProductDraft[] {
  const trimmed = raw.trim();
  let text = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/g, "").trim();
  try {
    const parsed = JSON.parse(text) as { products?: unknown[]; items?: unknown[] } | unknown[];
    let arr: unknown[] = [];
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (Array.isArray((parsed as { products?: unknown[] }).products)) {
      arr = (parsed as { products: unknown[] }).products;
    } else if (Array.isArray((parsed as { items?: unknown[] }).items)) {
      arr = (parsed as { items: unknown[] }).items;
    }
    const result = arr
      .filter((p): p is Record<string, unknown> => p != null && typeof p === "object")
      .filter((p) => p.name != null || p.description != null || p.category != null)
      .map(normalizeDraft);
    return result;
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const arr = JSON.parse(text.slice(start, end + 1)) as unknown[];
        if (Array.isArray(arr)) {
          return arr
            .filter((p): p is Record<string, unknown> => p != null && typeof p === "object")
            .map(normalizeDraft);
        }
      } catch {
        // ignore
      }
    }
    return [];
  }
}

@Injectable()
export class OpenAIService {
  private readonly apiKey = process.env.OPENAI_API_KEY ?? "";
  private readonly baseUrl = "https://api.openai.com/v1";

  /**
   * Sends the image to GPT-4o and returns structured product drafts (name, description, category).
   */
  async extractProductsFromImage(
    imageBuffer: Buffer,
    mimeType: string = "image/jpeg",
  ): Promise<DetectedProductDraft[]> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY env var is required for GPT-4o");
    }

    const base64 = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Image first often works better with vision models; detail "low" keeps payload smaller
    const body = {
      model: "gpt-4o",
      messages: [
        {
          role: "user" as const,
          content: [
            {
              type: "image_url" as const,
              image_url: { url: dataUrl, detail: "low" as const },
            },
            { type: "text" as const, text: EXTRACT_PRODUCTS_PROMPT },
          ],
        },
      ],
      max_tokens: 1024,
      // Omit response_format so vision + JSON doesn't sometimes yield empty content
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errText}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string | null };
        finish_reason?: string;
      }>;
      usage?: unknown;
    };
    const choice = json.choices?.[0];
    const content = choice?.message?.content;
    if (!content || !content.trim()) {
      const reason = choice?.finish_reason ?? "unknown";
      console.warn(
        "[OpenAIService] GPT-4o returned empty content. finish_reason=%s choice=%s",
        reason,
        JSON.stringify(choice ?? {}),
      );
      return [];
    }

    const drafts = extractProductsFromResponse(content);
    if (drafts.length === 0) {
      console.warn("[OpenAIService] No products parsed from response. Raw content:", content.slice(0, 500));
    }
    return drafts;
  }
}
