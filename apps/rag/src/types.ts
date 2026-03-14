/** Product row from DB (RAG inventory schema). */
export interface Product {
  id: string;
  title: string;
  category: string | null;
  subcategory: string | null;
  stone_color: string | null;
  occasion: string | null;
  price: number | null;
  description: string | null;
  stock_qty: number;
  updated_at?: string;
}

/** Parsed filters from user query. */
export interface QueryFilters {
  category: string | null;
  subcategory: string | null;
  maxPrice: number | null;
  minPrice: number | null;
  stoneColor: string | null;
  /** When true, only products with a stone_color set (stone-based). */
  requireStone: boolean;
  occasion: string | null;
}

/** Product with similarity score from match_products. */
export interface ProductWithSimilarity extends Product {
  similarity: number;
}

/** Normalized product for API response. */
export interface ProductSummary {
  id: string;
  title: string;
  price: number | null;
  stock_qty: number;
  category: string | null;
  stone_color: string | null;
}

/** RAG response shape. */
export interface RAGResponse {
  answerText: string;
  products: ProductSummary[];
  debug: {
    appliedFilters: QueryFilters;
    retrievalCount: number;
  };
}
