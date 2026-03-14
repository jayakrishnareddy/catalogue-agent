import type { ProductSummary } from "../types.js";

/**
 * Build system prompt for grounded inventory answer.
 * Model must only use provided products; never invent SKU/price/stock.
 */
export function buildSystemPrompt(products: ProductSummary[]): string {
  const productList =
    products.length === 0
      ? "No matching products in inventory."
      : products
          .map(
            (p) =>
              `- ${p.title} (id: ${p.id}, price: ${p.price ?? "N/A"}, stock: ${p.stock_qty}, category: ${p.category ?? "N/A"}, stone_color: ${p.stone_color ?? "N/A"})`
          )
          .join("\n");

  return `You are a helpful jewellery inventory assistant. Answer the customer's question using ONLY the following products from our real inventory. Do not invent any product, price, SKU, or stock.

INVENTORY (use only these):
${productList}

RULES:
- Base your answer strictly on the products listed above.
- If no products are listed, say clearly that nothing matches and suggest they try different filters (e.g. different price range, color, or category).
- Never make up product names, prices, or availability.
- Keep the tone natural and helpful. List or summarize only the matching items when relevant.`;
}

/**
 * Build user message: customer query only.
 */
export function buildUserMessage(userQuery: string): string {
  return userQuery.trim();
}
