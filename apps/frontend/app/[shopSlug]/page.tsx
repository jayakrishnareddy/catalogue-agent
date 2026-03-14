"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Gem, Tag, Box, IndianRupee, Search, ArrowLeft } from "lucide-react";
import { fetchProducts, type Product } from "../lib/api";
import { queryRag, type RAGProductSummary } from "../lib/ragApi";

const RAG_DEBOUNCE_MS = 500;

function capitalizeFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

type Props = { params: { shopSlug: string } };
export default function PublicCataloguePage({ params }: Props) {
  const { shopSlug } = params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">(
    "all"
  );

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
        setProducts(
          data.filter((p) => p.inStock === undefined || p.inStock === true)
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load catalogue"
        );
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
      if (selectedCategory !== "all" && p.category !== selectedCategory)
        return false;
      if (!q) return true;
      const haystack =
        `${p.name} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [products, search, selectedCategory]);

  const isRagMode = search.trim().length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Shop catalogue
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse products or search with AI — try &quot;red bridal earrings
          under 1000&quot;
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Search + filters */}
      <section className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search or ask AI…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isRagMode && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* RAG mode */}
      {isRagMode ? (
        <div className="space-y-6">
          {ragError && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
              {ragError}. Ensure the RAG server is running.
            </p>
          )}
          {ragLoading && (
            <p className="text-sm text-muted-foreground">
              Searching inventory…
            </p>
          )}
          {!ragLoading && !ragError && ragAnswer !== null && (
            <>
              <div className="rounded-2xl border border-border bg-muted/40 px-5 py-4 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Answer
                </p>
                <p className="text-foreground">{ragAnswer}</p>
              </div>
              {ragProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No matching products found.
                </p>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {ragProducts.map((product) => (
                    <RAGProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="space-y-3 p-4">
                    <div className="h-3.5 w-3/4 rounded-full bg-muted" />
                    <div className="h-3 w-full rounded-full bg-muted" />
                    <div className="flex gap-2">
                      <div className="h-5 w-16 rounded-full bg-muted" />
                      <div className="h-5 w-20 rounded-full bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
              <Gem className="mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No products yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Add products by uploading jewellery photos on the home page.
              </p>
              <a
                href="/"
                className="mt-6 inline-block rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Go to home
              </a>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products match your filters.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/40">
            <Gem className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
          In stock
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold leading-snug text-foreground">
          {product.name}
        </h2>

        {product.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        {/* Pills */}
        <div className="flex flex-wrap gap-1.5">
          {product.category && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {product.category}
            </span>
          )}
          {product.model && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              <Box className="h-3 w-3 text-muted-foreground" />
              {product.model}
            </span>
          )}
          {product.stoneColors && product.stoneColors.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              <Gem className="h-3 w-3 text-muted-foreground" />
              {product.stoneColors.map(capitalizeFirst).join(", ")}
            </span>
          )}
        </div>

        {/* Price */}
        {product.price != null && (
          <div className="mt-auto flex items-center gap-0.5 pt-1">
            <IndianRupee className="h-4 w-4 text-foreground" strokeWidth={2.5} />
            <span className="text-base font-bold text-foreground">
              {product.price.toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

function RAGProductCard({ product }: { product: RAGProductSummary }) {
  const stoneColors = product.stone_color
    ? [capitalizeFirst(product.stone_color)]
    : [];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground/40">
        <Gem className="h-10 w-10" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold leading-snug text-foreground">
          {product.title}
        </h2>

        <div className="flex flex-wrap gap-1.5">
          {product.category && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {product.category}
            </span>
          )}
          {stoneColors.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              <Gem className="h-3 w-3 text-muted-foreground" />
              {stoneColors.join(", ")}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          {product.price != null && (
            <div className="flex items-center gap-0.5">
              <IndianRupee
                className="h-4 w-4 text-foreground"
                strokeWidth={2.5}
              />
              <span className="text-base font-bold text-foreground">
                {product.price.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              product.stock_qty > 0
                ? "bg-emerald-500/90 text-white"
                : "bg-zinc-700/80 text-zinc-200"
            }`}
          >
            {product.stock_qty > 0 ? "In stock" : "Out of stock"}
          </span>
        </div>
      </div>
    </article>
  );
}
