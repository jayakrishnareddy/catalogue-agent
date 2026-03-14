import { supabase } from "../lib/db.js";
import { getEmbedding } from "../lib/embeddings.js";
import { parseQueryFilters } from "../lib/queryParser.js";
import type { ProductWithSimilarity, QueryFilters } from "../types.js";

const MATCH_COUNT = 12;

/** Map RPC row to ProductWithSimilarity. */
function rowToProduct(row: Record<string, unknown>): ProductWithSimilarity {
  return {
    id: row.product_id as string,
    title: row.title as string,
    category: (row.category as string) ?? null,
    subcategory: (row.subcategory as string) ?? null,
    stone_color: (row.stone_color as string) ?? null,
    occasion: (row.occasion as string) ?? null,
    price: row.price != null ? Number(row.price) : null,
    description: (row.description as string) ?? null,
    stock_qty: Number(row.stock_qty ?? 0),
    similarity: Number(row.similarity ?? 0),
  };
}

/**
 * Fallback when vector search returns no rows: filter products by category, max_price, stone_color, occasion.
 */
async function fallbackFilteredProducts(filters: QueryFilters): Promise<ProductWithSimilarity[]> {
  let q = supabase
    .from("rag_products")
    .select("id, title, category, subcategory, stone_color, occasion, price, description, stock_qty")
    .gt("stock_qty", 0)
    .limit(MATCH_COUNT);

  if (filters.category) {
    q = q.ilike("category", `%${filters.category}%`);
  }
  if (filters.maxPrice != null) {
    q = q.lte("price", filters.maxPrice);
  }
  if (filters.minPrice != null) {
    q = q.gte("price", filters.minPrice);
  }
  if (filters.stoneColor) {
    q = q.ilike("stone_color", `%${filters.stoneColor}%`);
  }
  if (filters.requireStone) {
    q = q.not("stone_color", "is", null);
  }
  if (filters.occasion) {
    q = q.ilike("occasion", `%${filters.occasion}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    category: (row.category as string) ?? null,
    subcategory: (row.subcategory as string) ?? null,
    stone_color: (row.stone_color as string) ?? null,
    occasion: (row.occasion as string) ?? null,
    price: row.price != null ? Number(row.price) : null,
    description: (row.description as string) ?? null,
    stock_qty: Number(row.stock_qty ?? 0),
    similarity: 0,
  }));
}

/**
 * Retrieve top products by semantic similarity + optional filters.
 * Falls back to SQL filter if vector search returns empty.
 */
export async function retrieveProducts(userQuery: string): Promise<{
  products: ProductWithSimilarity[];
  filters: QueryFilters;
}> {
  const filters = parseQueryFilters(userQuery);

  const queryEmbedding = await getEmbedding(userQuery);

  const { data: rows, error } = await supabase.rpc("match_products", {
    query_embedding: queryEmbedding,
    match_count: MATCH_COUNT,
    category_filter: filters.category,
    max_price: filters.maxPrice,
    min_price: filters.minPrice,
    stone_color_filter: filters.stoneColor,
    require_stone: filters.requireStone,
    occasion_filter: filters.occasion,
  });

  let products: ProductWithSimilarity[];
  if (error) {
    console.warn("match_products RPC error, using fallback:", error.message);
    products = await fallbackFilteredProducts(filters);
  } else if (!rows || rows.length === 0) {
    products = await fallbackFilteredProducts(filters);
  } else {
    products = rows.map((row: Record<string, unknown>) => rowToProduct(row));
  }

  return { products, filters };
}
