"use client";
import Link from "next/link";
import { useRef, useState, useEffect, type ChangeEvent } from "react";
import { Button } from "../components/ui/button";
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
          <h1 className="text-3xl font-semibold tracking-tight">Catalogue Agent for Local Shops</h1>
          <p className="text-muted-foreground">
            Upload messy shelf photos and let AI turn them into a clean, shareable product catalogue.
          </p>
          <div className="flex justify-center">
            <Button
              variant={generatedProducts.length > 0 ? "outline" : "default"}
              onClick={handleUploadClick}
            >
              Upload product photos
            </Button>
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

        {selectedFiles.length > 0 && (
          <section className="flex w-full flex-col items-center space-y-3">
            <h2 className="text-xl font-semibold">Selected photos</h2>
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {previewUrls.map((url, i) => (
                <div
                  key={url}
                  className="aspect-square overflow-hidden rounded-lg border bg-muted"
                >
                  <img
                    src={url}
                    alt={selectedFiles[i]?.name ?? `Preview ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            {isGenerating && (
              <p className="text-sm text-muted-foreground">Generating catalogue...</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </section>
        )}

        {generatedProducts.length > 0 && (
          <section className="w-full space-y-3 rounded-lg border bg-card p-4 text-left">
            <h2 className="text-xl font-semibold">Generated catalogue</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {generatedProducts.map((product) => (
                <div key={product.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-muted-foreground">{product.description}</div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
