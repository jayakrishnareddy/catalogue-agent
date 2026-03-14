"use client";

import { useEffect, useState } from "react";
import { GripVertical, Pencil } from "lucide-react";
import type { Product } from "../lib/api";
import {
  deleteProduct,
  fetchProducts,
  reorderProducts,
  updateProduct,
} from "../lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function ProductCard({
  product,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onClick,
}: {
  product: EditableProduct;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      className={`cursor-grab transition-shadow active:cursor-grabbing ${isDragging ? "opacity-60 shadow-lg" : "hover:shadow-md"}`}
    >
      <CardHeader className="flex flex-row items-start gap-2 space-y-0 pb-2">
        <span
          className="mt-0.5 shrink-0 cursor-grab text-muted-foreground"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <CardTitle className="flex-1 text-base leading-tight">
          {product.name || "—"}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent
        className="space-y-2 pt-0 text-sm text-muted-foreground"
        onClick={onClick}
      >
        {product.description ? (
          <p className="line-clamp-2">{product.description}</p>
        ) : null}
        {product.category ? (
          <p><span className="font-medium text-foreground">Category:</span> {product.category}</p>
        ) : null}
        {product.stoneColors && product.stoneColors.length > 0 ? (
          <p><span className="font-medium text-foreground">Stones:</span> {formatStoneColors(product.stoneColors)}</p>
        ) : null}
        {product.model ? (
          <p><span className="font-medium text-foreground">Model:</span> {product.model}</p>
        ) : null}
        <div className="flex items-center justify-between pt-1">
          {product.price != null ? (
            <span className="font-semibold text-foreground">₹{product.price}</span>
          ) : (
            <span>—</span>
          )}
          <span className={product.inStock ? "text-emerald-600" : "text-muted-foreground"}>
            {product.inStock !== false ? "In stock" : "Out of stock"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [catalogueUrl, setCatalogueUrl] = useState<string>("");
  const [editProduct, setEditProduct] = useState<EditableProduct | null>(null);
  const [editDraft, setEditDraft] = useState<EditableProduct | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProducts(SHOP_ID);
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

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
        prev.map((p) => (p.id === editDraft.id ? { ...p, ...updated } : p))
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

  const handleSyncOrder = async (id: string, toIndex: number) => {
    setError(null);
    try {
      const updated = await reorderProducts(SHOP_ID, id, toIndex);
      setProducts(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder");
    }
  };

  const handleDragEnd = async () => {
    const wasDragging = draggingId;
    setDraggingId(null);
    if (!wasDragging) return;
    const toIndex = products.findIndex((p) => p.id === wasDragging);
    if (toIndex === -1) return;
    await handleSyncOrder(wasDragging, toIndex);
  };

  const handleDragOver = (e: React.DragEvent, productId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === productId) return;
    setProducts((prev) => {
      const fromIndex = prev.findIndex((p) => p.id === draggingId);
      const toIndex = prev.findIndex((p) => p.id === productId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
        return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const updateDraft = (field: keyof EditableProduct, value: unknown) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Catalogue dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and edit products. Drag cards to reorder.
          </p>
        </div>
        {catalogueUrl && (
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex w-full max-w-xs items-center gap-2 sm:max-w-sm">
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                readOnly
                value={catalogueUrl}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(catalogueUrl);
                  } catch {}
                }}
              >
                Copy link
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent("Check out our catalogue: " + catalogueUrl)}`,
                  "_blank"
                )
              }
            >
              Share on WhatsApp
            </Button>
          </div>
        )}
      </header>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isDragging={draggingId === product.id}
              onDragStart={() => setDraggingId(product.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, product.id)}
              onClick={() => openEdit(product)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!editProduct} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editDraft.name}
                  onChange={(e) => updateDraft("name", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editDraft.description}
                  onChange={(e) => updateDraft("description", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Category</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editDraft.category ?? ""}
                  onChange={(e) =>
                    updateDraft("category", e.target.value || undefined)
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Stone colors</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formatStoneColors(editDraft.stoneColors)}
                  onChange={(e) =>
                    updateDraft("stoneColors", parseStoneColors(e.target.value))
                  }
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Model</label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editDraft.model ?? ""}
                  onChange={(e) =>
                    updateDraft("model", e.target.value.trim() || null)
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Price (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editDraft.price ?? ""}
                    onChange={(e) =>
                      updateDraft(
                        "price",
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={editDraft.inStock ?? false}
                      onChange={(e) =>
                        updateDraft("inStock", e.target.checked)
                      }
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
