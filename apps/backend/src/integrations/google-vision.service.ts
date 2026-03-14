import { Injectable } from "@nestjs/common";

export interface DetectedProductDraft {
  name: string;
  description: string;
  category?: string;
}

@Injectable()
export class GoogleVisionService {
  async extractProductsFromImage(imageBuffer: Buffer): Promise<DetectedProductDraft[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY env var is required for Vision API");
    }

    const base64 = imageBuffer.toString("base64");

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [
                { type: "TEXT_DETECTION", maxResults: 1 },
                { type: "LOGO_DETECTION", maxResults: 1 },
                { type: "LABEL_DETECTION", maxResults: 5 },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Vision API error: ${response.status} ${text}`);
    }

    const json = (await response.json()) as {
      responses?: Array<{
        labelAnnotations?: Array<{ description?: string; score?: number }>;
        fullTextAnnotation?: { text?: string };
        logoAnnotations?: Array<{ description?: string; score?: number }>;
      }>;
    };

    // Log Cloud Vision API response for debugging
    console.log("[GoogleVisionService] Vision API response:", JSON.stringify(json, null, 2));

    const visionResponse = json.responses?.[0];
    const labels = visionResponse?.labelAnnotations ?? [];
    const logos = visionResponse?.logoAnnotations ?? [];
    const fullText = visionResponse?.fullTextAnnotation?.text ?? "";

    // Try to derive a product-ish name:
    // 1) Logo description (brand) if present
    // 2) First non-empty line of detected text
    // 3) Primary label description
    const logoName = logos[0]?.description?.trim();
    const textLines = fullText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const textName = textLines[0];
    const primaryLabel = labels[0];
    const secondaryLabel = labels[1];

    const name =
      logoName ??
      textName ??
      primaryLabel?.description ??
      "Detected product";

    let description = "Product detected from image.";
    if (textLines.length > 1) {
      description = `Detected text on package: ${textLines
        .slice(0, 3)
        .join(" ")}`;
    } else if (primaryLabel?.description && secondaryLabel?.description) {
      description = `Looks like ${primaryLabel.description}, related to ${secondaryLabel.description}.`;
    } else if (primaryLabel?.description) {
      description = `Looks like ${primaryLabel.description}.`;
    }

    const category = secondaryLabel?.description ?? primaryLabel?.description;

    return [
      {
        name,
        description,
        category,
      },
    ];
  }
}
