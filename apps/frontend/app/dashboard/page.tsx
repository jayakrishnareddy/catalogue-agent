"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  Tag,
  Gem,
  Box,
  IndianRupee,
  ArrowLeft,
  Filter,
} from "lucide-react";
import Image from "next/image";
import type { Product } from "../lib/api";
import { deleteProduct, fetchProducts, updateProduct } from "../lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHOP_ID = "demo-shop";
type EditableProduct = Product & { isSaving?: boolean; isDeleting?: boolean };

function capitalizeColor(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t;
}

function formatStoneColors(colors: string[] | undefined): string {
  if (!colors?.length) return "";
  return colors.map(capitalizeColor).join(", ");
}

function parseStoneColors(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(capitalizeColor);
}

type PriceSort = "recent" | "price-asc" | "price-desc";

function ProductCard({
  product,
  onEdit,
}: {
  product: EditableProduct;
  onEdit: () => void;
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
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

        {/* Stock badge */}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ${
            product.inStock !== false
              ? "bg-emerald-500/90 text-white"
              : "bg-zinc-700/80 text-zinc-200"
          }`}
        >
          {product.inStock !== false ? "In stock" : "Out of stock"}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Name + edit button */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 text-sm font-semibold leading-snug text-foreground">
            {product.name || "—"}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Description */}
        {product.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        {/* Metadata pills */}
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
              {formatStoneColors(product.stoneColors)}
            </span>
          )}
        </div>

        {/* Price */}
        {product.price != null && (
          <div className="mt-auto flex items-center gap-0.5 pt-1">
            <IndianRupee
              className="h-4 w-4 text-foreground"
              strokeWidth={2.5}
            />
            <span className="text-base font-bold text-foreground">
              {product.price.toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<PriceSort>("recent");
  const [includeOutOfStock, setIncludeOutOfStock] = useState(false);
  const [catalogueUrl, setCatalogueUrl] = useState<string>("");
  const [editProduct, setEditProduct] = useState<EditableProduct | null>(null);
  const [editDraft, setEditDraft] = useState<EditableProduct | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProducts(SHOP_ID);
        setProducts(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load products",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = includeOutOfStock
      ? [...products]
      : products.filter((p) => p.inStock !== false);
    if (priceSort === "recent") {
      list = [...list].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (priceSort === "price-asc") {
      list = [...list].sort((a, b) => {
        const pa = a.price ?? Infinity;
        const pb = b.price ?? Infinity;
        return pa - pb;
      });
    } else {
      list = [...list].sort((a, b) => {
        const pa = a.price ?? -Infinity;
        const pb = b.price ?? -Infinity;
        return pb - pa;
      });
    }
    return list;
  }, [products, includeOutOfStock, priceSort]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCatalogueUrl(`${window.location.origin}/${SHOP_ID}`);
  }, []);

  const openEdit = (product: EditableProduct) => {
    setEditProduct(product);
    setEditDraft({ ...product });
  };

  const closeEdit = () => {
    setEditProduct(null);
    setEditDraft(null);
  };

  const handleSave = async () => {
    if (!editDraft) return;
    setError(null);
    try {
      const updated = await updateProduct(SHOP_ID, editDraft.id, {
        name: editDraft.name,
        description: editDraft.description,
        category: editDraft.category,
        price: editDraft.price,
        inStock: editDraft.inStock,
        stoneColors: editDraft.stoneColors,
        model: editDraft.model,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === editDraft.id ? { ...p, ...updated } : p)),
      );
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleDelete = async () => {
    if (!editDraft || !window.confirm("Remove this product?")) return;
    setError(null);
    try {
      await deleteProduct(SHOP_ID, editDraft.id);
      setProducts((prev) => prev.filter((p) => p.id !== editDraft.id));
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const updateDraft = (field: keyof EditableProduct, value: unknown) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Catalogue
          </h1>
          <p className="text-sm text-muted-foreground">
            {products.length > 0
              ? `${products.length} item${products.length !== 1 ? "s" : ""} · latest`
              : "Review and edit your products"}
          </p>
        </div>

        {catalogueUrl && (
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex w-full max-w-xs items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 sm:max-w-sm">
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {catalogueUrl}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-2 text-xs"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(catalogueUrl);
                  } catch {}
                }}
              >
                Copy
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => {
                const message = `Check out our catalogue:\n\n${catalogueUrl}`;
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(message)}`,
                  "_blank",
                );
              }}
            >
              Share on WhatsApp
            </Button>
          </div>
        )}
      </header>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Filters */}
      {!loading && products.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
            <select
              className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value as PriceSort)}
            >
              <option value="recent">Latest</option>
              <option value="price-asc">Low → high</option>
              <option value="price-desc">High → low</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={includeOutOfStock}
                onChange={(e) => setIncludeOutOfStock(e.target.checked)}
              />
              Include out of stock
            </label>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="aspect-[4/3] bg-muted" />
              <div className="space-y-3 p-4">
                <div className="h-3.5 w-3/4 rounded-full bg-muted" />
                <div className="h-3 w-full rounded-full bg-muted" />
                <div className="h-3 w-5/6 rounded-full bg-muted" />
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
            Go back and upload jewellery photos to get started.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-6 rounded-xl"
          >
            <Link href="/">
              <ArrowLeft className="h-3.5 w-3.5" /> Go to home
            </Link>
          </Button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {products.length > 0 && !includeOutOfStock
              ? "No in-stock products. Check “Include out of stock” to see all."
              : "No products yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEdit(product)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => !open && closeEdit()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <div className="grid gap-4 py-2">
              {editDraft.imageUrl && (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted">
                  <Image
                    src={editDraft.imageUrl}
                    alt={editDraft.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={editDraft.name}
                  onChange={(e) => updateDraft("name", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={editDraft.description}
                  onChange={(e) => updateDraft("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Category</label>
                  <input
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editDraft.category ?? ""}
                    onChange={(e) =>
                      updateDraft("category", e.target.value || undefined)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Model</label>
                  <input
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editDraft.model ?? ""}
                    onChange={(e) =>
                      updateDraft("model", e.target.value.trim() || null)
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Stone colors</label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Ruby, Emerald, Diamond"
                  value={formatStoneColors(editDraft.stoneColors)}
                  onChange={(e) =>
                    updateDraft("stoneColors", parseStoneColors(e.target.value))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Price (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editDraft.price ?? ""}
                    onChange={(e) =>
                      updateDraft(
                        "price",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={editDraft.inStock ?? false}
                      onChange={(e) => updateDraft("inStock", e.target.checked)}
                    />
                    In stock
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="mr-auto"
            >
              Remove
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={closeEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
