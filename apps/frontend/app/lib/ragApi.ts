const ragUrl = process.env.NEXT_PUBLIC_RAG_URL ?? "http://localhost:4001";

export interface RAGProductSummary {
  id: string;
  title: string;
  price: number | null;
  stock_qty: number;
  category: string | null;
  stone_color: string | null;
}

export interface RAGResponse {
  answerText: string;
  products: RAGProductSummary[];
  debug: {
    appliedFilters: Record<string, unknown>;
    retrievalCount: number;
  };
}

export async function queryRag(query: string): Promise<RAGResponse> {
  const res = await fetch(`${ragUrl}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query.trim() }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `RAG request failed: ${res.status}`);
  }
  return res.json() as Promise<RAGResponse>;
}
