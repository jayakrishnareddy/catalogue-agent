"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProducts, type Product } from "../lib/api";
import { queryRag, type RAGProductSummary } from "../lib/ragApi";

const RAG_DEBOUNCE_MS = 500;

type Props = { params: { shopSlug: string } };
export default function PublicCataloguePage({ params }: Props) {
  const { shopSlug } = params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");

  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [ragProducts, setRagProducts] = useState<RAGProductSummary[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProducts(shopSlug);
        setProducts(data.filter((p) => p.inStock === undefined || p.inStock === true));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load catalogue");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [shopSlug]);

  const runRagSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setRagAnswer(null);
      setRagProducts([]);
      setRagError(null);
      return;
    }
    setRagLoading(true);
    setRagError(null);
    setRagAnswer(null);
    setRagProducts([]);
    try {
      const result = await queryRag(q);
      setRagAnswer(result.answerText);
      setRagProducts(result.products);
    } catch (err) {
      setRagError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setRagLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim()) void runRagSearch(search);
      else {
        setRagAnswer(null);
        setRagProducts([]);
        setRagError(null);
      }
    }, RAG_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search, runRagSearch]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (!q) return true;
      const haystack = `${p.name} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [products, search, selectedCategory]);

  const isRagMode = search.trim().length > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Shop catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Browse products, filter by category, or type a sentence (e.g. “red bridal earrings under 1000”) to search with AI.
        </p>
      </header>
      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-600">{error}</p>
      )}
      <section className="space-y-3">
        <input
          className="w-full max-w-md rounded-md border px-3 py-2 text-sm"
          placeholder="e.g. red bridal earrings under 1000, daily wear necklace around 700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!isRagMode && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${selectedCategory === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
              onClick={() => setSelectedCategory("all")}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${selectedCategory === cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </section>

      {isRagMode ? (
        <>
          {ragError && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700">
              {ragError}. Ensure the RAG server is running (e.g. npm run dev:rag).
            </p>
          )}
          {ragLoading && <p className="text-sm text-muted-foreground">Searching inventory…</p>}
          {!ragLoading && !ragError && ragAnswer !== null && (
            <>
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p className="font-medium text-muted-foreground">Answer</p>
                <p className="mt-1 text-foreground">{ragAnswer}</p>
              </div>
              {ragProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching products in inventory.</p>
              ) : (
                <section>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ragProducts.map((product) => (
                      <RAGProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading products…</p>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center">
              <p className="font-medium text-muted-foreground">No products in this catalogue yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Add products by uploading jewellery photos on the home page.</p>
              <a href="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Go to home
              </a>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products match your filters.</p>
          ) : (
            <section>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((product) => (
                  <article
                    key={product.id}
                    className="flex flex-col justify-between rounded-lg border bg-card p-4 text-sm shadow-sm"
                  >
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold leading-snug">{product.name}</h2>
                      {product.model && (
                        <span className="text-[11px] text-muted-foreground">Model: {product.model}</span>
                      )}
                      {product.category && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                          {product.category}
                        </span>
                      )}
                      {product.stoneColors && product.stoneColors.length > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          Stones: {product.stoneColors.map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()).join(", ")}
                        </span>
                      )}
                      {product.description && (
                        <p className="text-xs text-muted-foreground">{product.description}</p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      {product.price !== undefined && (
                        <span className="text-sm font-semibold">₹{product.price}</span>
                      )}
                      <span className="text-[11px] font-medium uppercase text-emerald-600">In stock</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RAGProductCard({ product }: { product: RAGProductSummary }) {
  const stoneColors = product.stone_color
    ? [product.stone_color].map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
    : [];
  return (
    <article className="flex flex-col justify-between rounded-lg border bg-card p-4 text-sm shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold leading-snug">{product.title}</h2>
        {product.category && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
            {product.category}
          </span>
        )}
        {stoneColors.length > 0 && (
          <span className="text-[11px] text-muted-foreground">Stones: {stoneColors.join(", ")}</span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {product.price != null && <span className="text-sm font-semibold">₹{product.price}</span>}
        <span className="text-[11px] font-medium uppercase text-emerald-600">
          {product.stock_qty > 0 ? "In stock" : "Out of stock"}
        </span>
      </div>
    </article>
  );
}
