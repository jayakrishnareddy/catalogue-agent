import { Injectable } from "@nestjs/common";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import type { DetectedProductDraft } from "./google-vision.service";

const EXTRACT_PRODUCTS_PROMPT = `You are analyzing a photo of consumer products (e.g. biscuits, snacks, packaged goods on a table or shelf). The image may contain many different items.

Your task:
1. Identify EVERY distinct product visible—each different packet, box, or bottle is one item.
2. For each item provide: "name" (brand + product name as on pack, e.g. "Britannia Good Day Butter Cookies"), "category" (e.g. Snacks, Biscuits, Beverages, Household), "description" (1–2 sentence marketing-style description).

Return ONLY a valid JSON array. No markdown, no code fences, no explanation before or after. Each object must have exactly: "name", "description", "category".
Example: [{"name":"Britannia Marie Gold","description":"Classic Marie biscuits, perfect with tea.","category":"Biscuits"},{"name":"Britannia Good Day Butter Cookies","description":"Butter cookies with a rich, crisp taste.","category":"Biscuits"}]

If multiple identical packets of the same product are visible, list that product once. List every different product you can see.`;

/** Extract a JSON array from model output that may contain surrounding text or markdown. */
function extractJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  const slice = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const PRODUCT_IMAGE_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

@Injectable()
export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");

  /**
   * Analyzes an image with Gemini Vision to identify all visible product items,
   * extract names, estimate categories, and generate descriptions.
   */
  async extractProductsFromImage(
    imageBuffer: Buffer,
    mimeType: string = "image/jpeg",
  ): Promise<DetectedProductDraft[]> {
    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: PRODUCT_IMAGE_SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });
    const base64 = imageBuffer.toString("base64");
    const imagePart = { inlineData: { data: base64, mimeType } };

    try {
      // Structured request: prompt + image in a single user turn
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: EXTRACT_PRODUCTS_PROMPT }, imagePart],
          },
        ],
      });

      const raw = result.response.text();
      if (!raw || !raw.trim()) return [];

      let parsedUnknown: unknown;
      try {
        // With responseMimeType=application/json this should normally be valid JSON
        parsedUnknown = JSON.parse(raw);
      } catch {
        parsedUnknown = extractJsonArray(raw);
      }

      const parsedArray =
        Array.isArray(parsedUnknown) && parsedUnknown.length > 0
          ? parsedUnknown
          : extractJsonArray(String(raw));

      const parsed = parsedArray as Array<{
        name?: string;
        description?: string;
        category?: string;
      }>;

      return parsed
        .filter((p) => p && typeof p === "object" && (p.name ?? p.description ?? p.category))
        .map((p) => ({
          name: String(p.name ?? "Detected product").trim() || "Detected product",
          description: String(p.description ?? "Product detected from image.").trim(),
          category: p.category?.trim(),
        }));
    } catch {
      return [];
    }
  }

  async generateCatalogueCopy(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text;
  }

  async refineProductDraft(
    draft: DetectedProductDraft,
  ): Promise<DetectedProductDraft> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You help small shop owners turn rough product info into clean catalogue entries.

Return ONLY a single JSON object with this shape (no backticks, no explanation):
{
  "name": "short product name, as a customer would see it on a product card",
  "description": "1-2 sentence marketing-style description, clear and simple",
  "category": "high-level category like Snacks, Dairy, Household, Electronics, etc."
}

Keep language simple and neutral (Indian general audience is fine).

Here is the rough product draft detected from an image:
${JSON.stringify(draft, null, 2)}
`;

    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();

      // Strip common Markdown fences if present
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(text) as {
        name?: string;
        description?: string;
        category?: string;
      };

      return {
        name: parsed.name?.trim() || draft.name,
        description: parsed.description?.trim() || draft.description,
        category: parsed.category?.trim() || draft.category,
      };
    } catch {
      // If the Gemini API is blocked or parsing fails, fall back to the vision draft
      return draft;
    }
  }
}
