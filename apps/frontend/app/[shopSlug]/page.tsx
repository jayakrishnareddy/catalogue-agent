"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchProducts, type Product } from "../lib/api";
type Props = { params: { shopSlug: string } };
export default function PublicCataloguePage({ params }: Props) {
  const { shopSlug } = params;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
  useEffect(() => { const load = async () => { setLoading(true); setError(null); try { const data = await fetchProducts(shopSlug); setProducts(data.filter((p) => p.inStock === undefined || p.inStock === true)); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load catalogue"); } finally { setLoading(false); } }; void load(); }, [shopSlug]);
  const categories = useMemo(() => { const set = new Set<string>(); for (const p of products) { if (p.category) set.add(p.category); } return Array.from(set).sort(); }, [products]);
  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return products.filter((p) => { if (selectedCategory !== "all" && p.category !== selectedCategory) return false; if (!q) return true; const haystack = `${p.name} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase(); return haystack.includes(q); }); }, [products, search, selectedCategory]);
  return (
    <div className="space-y-6">
      <header className="space-y-2"><h1 className="text-2xl font-semibold">Shop catalogue</h1><p className="text-sm text-muted-foreground">Browse products, filter by category, or search.</p></header>
      {error && <p className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-600">{error}</p>}
      <section className="space-y-3">
        <input className="w-full max-w-md rounded-md border px-3 py-2 text-sm" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`rounded-full border px-3 py-1 text-xs ${selectedCategory === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`} onClick={() => setSelectedCategory("all")}>All</button>
            {categories.map((cat) => (
              <button key={cat} type="button" className={`rounded-full border px-3 py-1 text-xs ${selectedCategory === cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
            ))}
          </div>
        )}
      </section>
      {loading ? <p className="text-sm text-muted-foreground">Loading products…</p> : filtered.length === 0 ? <p className="text-sm text-muted-foreground">No products match your filters.</p> : (
        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <article key={product.id} className="flex flex-col justify-between rounded-lg border bg-card p-4 text-sm shadow-sm">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold leading-snug">{product.name}</h2>
                  {product.category && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">{product.category}</span>}
                  {product.description && <p className="text-xs text-muted-foreground">{product.description}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {product.price !== undefined && <span className="text-sm font-semibold">₹{product.price}</span>}
                  <span className="text-[11px] font-medium uppercase text-emerald-600">In stock</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
