import { supabase } from "../lib/db.js";
import { buildEmbeddingText, getEmbedding, upsertProductEmbedding } from "../lib/embeddings.js";
import type { Product } from "../types.js";

async function main(): Promise<void> {
  const { data: products, error } = await supabase
    .from("rag_products")
    .select("id, title, category, subcategory, stone_color, occasion, price, description, stock_qty, updated_at");

  if (error) {
    console.error("Failed to fetch products:", error);
    process.exit(1);
  }

  const list = (products ?? []) as Product[];
  console.log(`Reindexing ${list.length} products...`);

  for (let i = 0; i < list.length; i++) {
    const product = list[i];
    const embeddingText = buildEmbeddingText(product);
    const embedding = await getEmbedding(embeddingText);
    await upsertProductEmbedding(product.id, embedding, embeddingText);
    console.log(`  [${i + 1}/${list.length}] ${product.title}`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
