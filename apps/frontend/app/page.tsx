"use client";
import Link from "next/link";
import { Upload, Sparkles, ArrowRight, Gem, Pencil } from "lucide-react";
import { useRef, useState, useEffect, type ChangeEvent } from "react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { updateProduct, type Product } from "./lib/api";

const SHOP_ID = "demo-shop";

function formatStoneColors(colors: string[] | undefined): string {
  if (!colors?.length) return "";
  return colors.map((c) => c.trim()).filter(Boolean).join(", ");
}

function parseStoneColors(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Edit dialog state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editDraft, setEditDraft] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setSelectedFiles(Array.from(files));
  };

  const handleUploadMore = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setGeneratedProducts([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (selectedFiles.length === 0) return;
    let cancelled = false;
    setIsGenerating(true);
    setGeneratedProducts([]);
    setError(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("images", file));
    fetch(`${backendUrl}/api/shops/${SHOP_ID}/products/from-images`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate catalogue");
        return res.json() as Promise<Product[]>;
      })
      .then((data) => { if (!cancelled) setGeneratedProducts(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong"); })
      .finally(() => { if (!cancelled) setIsGenerating(false); });
    return () => { cancelled = true; };
  }, [selectedFiles]);

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setEditDraft({ ...product });
    setEditError(null);
  };

  const closeEdit = () => {
    setEditProduct(null);
    setEditDraft(null);
    setEditError(null);
  };

  const updateDraft = (field: keyof Product, value: unknown) => {
    setEditDraft((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!editDraft) return;
    setIsSaving(true);
    setEditError(null);
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
      setGeneratedProducts((prev) =>
        prev.map((p) => (p.id === editDraft.id ? { ...p, ...updated } : p))
      );
      closeEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const hasResults = generatedProducts.length > 0;

  const STEPS = [
    "Analysing your photos…",
    "Identifying jewellery pieces…",
    "Extracting product details…",
    "Building your catalogue…",
  ];
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    if (!isGenerating) { setStepIndex(0); return; }
    const id = setInterval(() => setStepIndex((s) => (s + 1) % STEPS.length), 1800);
    return () => clearInterval(id);
  }, [isGenerating]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 pt-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Gem className="h-7 w-7 text-primary" strokeWidth={2} />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Jewellery Catalogue,{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              powered by AI
            </span>
          </h1>
          <p className="mx-auto max-w-md text-base text-muted-foreground">
            Upload photos of your jewellery and let AI build a clean, shareable product catalogue instantly.
          </p>
        </div>

        {/* Upload zone — hidden once files are selected */}
        {selectedFiles.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex w-full max-w-sm cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-8 py-10 transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border transition-transform group-hover:scale-110">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium text-foreground">Click to upload jewellery photos</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP — multiple files supported</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />

        {/* Uploaded image previews */}
        {previewUrls.length > 0 && (
          <div className="flex w-full max-w-sm flex-wrap justify-center gap-2">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex w-full max-w-sm flex-col items-center gap-3">
            <p className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-center text-sm text-red-600">
              {error}
            </p>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={handleUploadMore}>
              <Upload className="h-4 w-4" /> Upload again
            </Button>
          </div>
        )}
      </section>

      {/* Loading state */}
      {isGenerating && (
        <section className="space-y-8">
          {/* AI status banner */}
          <div className="relative overflow-hidden rounded-2xl px-6 py-10 text-center">

            <div className="relative flex flex-col items-center gap-5">
              {/* Layered spinning rings */}
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full animate-spin [animation-duration:3s]" viewBox="0 0 64 64" fill="none">
                  <defs>
                    <linearGradient id="ring1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="28" stroke="url(#ring1)" strokeWidth="3" strokeDasharray="110 65" strokeLinecap="round" />
                </svg>
                <svg className="absolute inset-0 h-full w-full animate-spin [animation-duration:2s] [animation-direction:reverse]" viewBox="0 0 64 64" fill="none">
                  <defs>
                    <linearGradient id="ring2" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="20" stroke="url(#ring2)" strokeWidth="2.5" strokeDasharray="80 46" strokeLinecap="round" />
                </svg>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Cycling step */}
              <div className="space-y-1.5">
                <p
                  key={stepIndex}
                  className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-base font-bold text-transparent"
                >
                  {STEPS[stepIndex]}
                </p>
                <p className="text-xs text-muted-foreground">
                  Processing {selectedFiles.length} photo{selectedFiles.length !== 1 ? "s" : ""} with AI
                </p>
              </div>

              {/* Coloured step dots */}
              <div className="flex items-center gap-2">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    style={{ transition: "all 0.5s" }}
                    className={`h-1.5 rounded-full ${
                      i === stepIndex
                        ? "w-5 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        : i < stepIndex
                        ? "w-1.5 bg-violet-400/50"
                        : "w-1.5 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Skeleton cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: Math.max(3, selectedFiles.length) }).map((_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {i < previewUrls.length && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrls[i]} alt="" className="h-full w-full object-cover opacity-25" />
                  )}
                  {/* Coloured shimmer sweep */}
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-indigo-500/10" />
                </div>
                <div className="space-y-3 p-4">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5">
                  <Skeleton className="h-3.5 w-28 rounded-full" />
                  <Skeleton className="h-3.5 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      {hasResults && (
        <section className="space-y-6">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Generated catalogue
              </h2>
              <p className="text-sm text-muted-foreground">
                {generatedProducts.length} item{generatedProducts.length !== 1 ? "s" : ""} · click the pencil to edit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={handleUploadMore}>
                <Upload className="h-3.5 w-3.5" /> Upload more
              </Button>
              <Button asChild size="sm" className="rounded-xl gap-1.5">
                <Link href="/dashboard">
                  Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {generatedProducts.map((product, i) => (
              <div
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {i < previewUrls.length ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrls[i]}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Gem className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Category badge */}
                  {product.category && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                      {product.category}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {product.name}
                    </p>
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                  {product.stoneColors && product.stoneColors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {product.stoneColors.map((color) => (
                        <span
                          key={color}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                        >
                          <Gem className="h-2.5 w-2.5 text-muted-foreground" />
                          {color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Added to catalogue
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <div className="grid gap-4 py-2">
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
                    onChange={(e) => updateDraft("category", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Price (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editDraft.price ?? ""}
                    onChange={(e) =>
                      updateDraft("price", e.target.value === "" ? undefined : Number(e.target.value))
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
                  onChange={(e) => updateDraft("stoneColors", parseStoneColors(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="instock"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={editDraft.inStock ?? false}
                  onChange={(e) => updateDraft("inStock", e.target.checked)}
                />
                <label htmlFor="instock" className="cursor-pointer text-sm font-medium">In stock</label>
              </div>
              {editError && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-600">
                  {editError}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={closeEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
