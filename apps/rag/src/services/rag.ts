import { openai, CHAT_MODEL } from "../lib/openai.js";
import { retrieveProducts } from "./retrieval.js";
import { buildSystemPrompt, buildUserMessage } from "../prompts/inventoryRagPrompt.js";
import type { ProductSummary, RAGResponse } from "../types.js";

function toSummary(p: { id: string; title: string; price: number | null; stock_qty: number; category: string | null; stone_color: string | null }): ProductSummary {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    stock_qty: p.stock_qty,
    category: p.category,
    stone_color: p.stone_color,
  };
}

/**
 * End-to-end RAG: retrieve products from DB, then generate a grounded natural-language answer.
 */
export async function answerInventoryQuery(userQuery: string): Promise<RAGResponse> {
  const { products, filters } = await retrieveProducts(userQuery);
  const summaries: ProductSummary[] = products.map(toSummary);

  const systemPrompt = buildSystemPrompt(summaries);
  const userMessage = buildUserMessage(userQuery);

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 512,
    temperature: 0.3,
  });

  const answerText = completion.choices[0]?.message?.content?.trim() ?? "I couldn't generate a response. Please try again.";

  return {
    answerText,
    products: summaries,
    debug: {
      appliedFilters: filters,
      retrievalCount: products.length,
    },
  };
}
