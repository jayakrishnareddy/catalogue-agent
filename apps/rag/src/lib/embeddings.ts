import { openai, EMBEDDING_MODEL } from "./openai.js";
import { supabase } from "./db.js";
import type { Product } from "../types.js";

/** Build a single searchable text from product fields for embedding. */
export function buildEmbeddingText(product: Product): string {
  const parts = [
    product.title,
    product.category,
    product.subcategory,
    product.stone_color,
    product.occasion,
    product.description,
    product.price != null ? `price ${product.price}` : "",
  ].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Get embedding vector for text using text-embedding-3-small (1536 dims). */
export async function getEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191),
  });
  const vec = res.data[0]?.embedding;
  if (!vec || vec.length !== 1536) {
    throw new Error("Invalid embedding returned");
  }
  return vec;
}

/** Upsert one product embedding row. */
export async function upsertProductEmbedding(
  productId: string,
  embedding: number[],
  embeddingText: string
): Promise<void> {
  const { error } = await supabase.from("rag_product_embeddings").upsert(
    {
      product_id: productId,
      embedding,
      embedding_text: embeddingText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id" }
  );
  if (error) throw error;
}
