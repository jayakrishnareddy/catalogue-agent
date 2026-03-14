"use client";
import { useEffect, useState } from "react";
import type { Product } from "../lib/api";
import { deleteProduct, fetchProducts, reorderProducts, updateProduct } from "../lib/api";
import { Button } from "@/components/ui/button";
const SHOP_ID = "demo-shop";
type EditableProduct = Product & { isSaving?: boolean; isDeleting?: boolean };
export default function DashboardPage() {
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [catalogueUrl, setCatalogueUrl] = useState<string>("");
  useEffect(() => { const load = async () => { try { const data = await fetchProducts(SHOP_ID); setProducts(data); } catch (err) { setError(err instanceof Error ? err.message : "Failed to load products"); } finally { setLoading(false); } }; void load(); }, []);
  useEffect(() => { if (typeof window === "undefined") return; setCatalogueUrl(`${window.location.origin}/${SHOP_ID}`); }, []);
  const handleFieldChange = (id: string, field: keyof EditableProduct, value: unknown) => { setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))); };
  const handleSave = async (product: EditableProduct) => { setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isSaving: true } : p))); setError(null); try { const updated = await updateProduct(SHOP_ID, product.id, { name: product.name, description: product.description, category: product.category, price: product.price, inStock: product.inStock }); setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...updated } : p))); } catch (err) { setError(err instanceof Error ? err.message : "Failed to save product"); } finally { setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isSaving: false } : p))); } };
  const handleDelete = async (id: string) => { if (!window.confirm("Remove this product?")) return; setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isDeleting: true } : p))); setError(null); try { await deleteProduct(SHOP_ID, id); setProducts((prev) => prev.filter((p) => p.id !== id)); } catch (err) { setError(err instanceof Error ? err.message : "Failed to delete"); setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isDeleting: false } : p))); } };
  const handleSyncOrder = async (id: string, toIndex: number) => { setError(null); try { const updated = await reorderProducts(SHOP_ID, id, toIndex); setProducts(updated); } catch (err) { setError(err instanceof Error ? err.message : "Failed to reorder"); } };
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Catalogue dashboard</h1><p className="text-sm text-muted-foreground">Review and edit products.</p></div>
        {catalogueUrl && (
          <div className="flex flex-col items-end gap-2">
            <input className="max-w-xs rounded-md border px-2 py-1 text-xs" readOnly value={catalogueUrl} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(catalogueUrl); } catch {} }}>Copy link</Button>
              <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Check out our catalogue: " + catalogueUrl)}`, "_blank")}>Share on WhatsApp</Button>
            </div>
          </div>
        )}
      </header>
      {error && <p className="rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-600">{error}</p>}
      {loading ? <p className="text-sm text-muted-foreground">Loading products…</p> : products.length === 0 ? <p className="text-sm text-muted-foreground">No products yet.</p> : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60"><tr><th/><th>Name</th><th>Description</th><th>Category</th><th>Price</th><th>In stock</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-border/60 align-top" draggable onDragStart={() => setDraggingId(product.id)} onDragEnd={async () => { const wasDragging = draggingId; setDraggingId(null); if (!wasDragging) return; const toIndex = products.findIndex((p) => p.id === wasDragging); if (toIndex === -1) return; await handleSyncOrder(wasDragging, toIndex); }} onDragOver={(e) => { e.preventDefault(); if (!draggingId || draggingId === product.id) return; setProducts((prev) => { const fromIndex = prev.findIndex((p) => p.id === draggingId); const toIndex = prev.findIndex((p) => p.id === product.id); if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev; const copy = [...prev]; const [item] = copy.splice(fromIndex, 1); copy.splice(toIndex, 0, item); return copy; }); }}>
                  <td><span className="cursor-move">⋮⋮</span></td>
                  <td><input className="w-full rounded-md border px-2 py-1 text-sm" value={product.name} onChange={(e) => handleFieldChange(product.id, "name", e.target.value)} /></td>
                  <td><textarea className="min-h-[60px] w-full rounded-md border px-2 py-1 text-sm" value={product.description} onChange={(e) => handleFieldChange(product.id, "description", e.target.value)} /></td>
                  <td><input className="w-full rounded-md border px-2 py-1 text-sm" placeholder="Category" value={product.category ?? ""} onChange={(e) => handleFieldChange(product.id, "category", e.target.value)} /></td>
                  <td><input className="w-full rounded-md border px-2 py-1 text-sm" type="number" value={product.price ?? ""} onChange={(e) => handleFieldChange(product.id, "price", e.target.value === "" ? undefined : Number(e.target.value))} /></td>
                  <td><input type="checkbox" checked={product.inStock ?? false} onChange={(e) => handleFieldChange(product.id, "inStock", e.target.checked)} /></td>
                  <td>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(product.id)} disabled={product.isDeleting}>{product.isDeleting ? "Removing..." : "Remove"}</Button>
                    <Button size="sm" onClick={() => handleSave(product)} disabled={product.isSaving}>{product.isSaving ? "Saving..." : "Save"}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
