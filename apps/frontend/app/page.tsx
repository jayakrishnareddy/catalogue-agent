"use client";
import Link from "next/link";
import { Upload } from "lucide-react";
import { useRef, useState, useEffect, type ChangeEvent } from "react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import type { Product } from "./lib/api";

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [selectedFiles]);

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setSelectedFiles(Array.from(files));
  };

  useEffect(() => {
    if (selectedFiles.length === 0) return;
    let cancelled = false;
    setIsGenerating(true);
    setError(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("images", file));
    fetch(`${backendUrl}/api/shops/demo-shop/products/from-images`, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to generate catalogue");
        return response.json() as Promise<Product[]>;
      })
      .then((data) => {
        if (!cancelled) setGeneratedProducts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFiles]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center">
      <div className="flex w-full max-w-2xl flex-col items-center justify-center space-y-8 text-center">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">Catalogue Agent for Jewellery</h1>
          <p className="text-muted-foreground">
            Upload photos of your jewellery and let AI build a clean, shareable catalogue.
          </p>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <Button
                variant={generatedProducts.length > 0 ? "outline" : "default"}
                onClick={handleUploadClick}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload jewellery photos
              </Button>
              {generatedProducts.length > 0 && (
                <Button size="sm" asChild>
                  <Link href="/dashboard">Open dashboard</Link>
                </Button>
              )}
            </div>
            {error && generatedProducts.length === 0 && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </section>

        {isGenerating && (
          <section className="w-full space-y-4 text-left">
            <Skeleton className="h-7 w-48" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: Math.max(3, selectedFiles.length) }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm"
                >
                  <Skeleton className="aspect-square w-full shrink-0 rounded-none" />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {generatedProducts.length > 0 && (
          <section className="w-full space-y-4 text-left">
            <h2 className="text-xl font-semibold">Generated catalogue</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {generatedProducts.map((product, i) => (
                <div
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm"
                >
                  {i < previewUrls.length ? (
                    <div className="aspect-square w-full shrink-0 overflow-hidden bg-muted">
                      <img
                        src={previewUrls[i]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="font-medium">{product.name}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
