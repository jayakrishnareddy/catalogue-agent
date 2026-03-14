"use client";
import Link from "next/link";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "../components/ui/button";
import type { Product } from "./lib/api";
export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showSample, setShowSample] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProducts, setGeneratedProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const handleUploadClick = () => { fileInputRef.current?.click(); };
  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => { const files = event.target.files; if (!files) return; setSelectedFiles(Array.from(files)); };
  const handleGenerateCatalogue = async () => {
    if (!selectedFiles.length) return;
    setIsGenerating(true); setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
      const formData = new FormData(); selectedFiles.forEach((file) => formData.append("images", file));
      const response = await fetch(`${backendUrl}/api/shops/demo-shop/products/from-images`, { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to generate catalogue");
      const data = (await response.json()) as Product[]; setGeneratedProducts(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); } finally { setIsGenerating(false); }
  };
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Catalogue Agent for Local Shops</h1>
        <p className="max-w-2xl text-muted-foreground">Upload messy shelf photos and let AI turn them into a clean, shareable product catalogue.</p>
        <div className="flex gap-3">
          <Button onClick={handleUploadClick}>Upload product photos</Button>
          <Button variant="outline" onClick={() => setShowSample(true)}>View sample catalogue</Button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
      </section>
      {selectedFiles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Selected photos</h2>
          <Button onClick={handleGenerateCatalogue} disabled={isGenerating}>{isGenerating ? "Generating catalogue..." : "Generate catalogue"}</Button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </section>
      )}
      {generatedProducts.length > 0 && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-xl font-semibold">Generated catalogue</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {generatedProducts.map((product) => (
              <div key={product.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{product.name}</div>
                <div className="text-muted-foreground">{product.description}</div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm"><Link href="/dashboard">Open dashboard</Link></Button>
        </section>
      )}
      {showSample && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-xl font-semibold">Sample catalogue</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border p-3 text-sm"><div className="font-medium">Parle-G Biscuits (800g)</div><div className="text-muted-foreground">Classic glucose biscuits.</div><div className="mt-1 font-semibold">₹75</div></div>
            <div className="rounded-md border p-3 text-sm"><div className="font-medium">Amul Taaza Milk (1L)</div><div className="text-muted-foreground">Toned milk.</div><div className="mt-1 font-semibold">₹64</div></div>
            <div className="rounded-md border p-3 text-sm"><div className="font-medium">Tata Salt (1kg)</div><div className="text-muted-foreground">Iodized salt.</div><div className="mt-1 font-semibold">₹28</div></div>
          </div>
        </section>
      )}
    </div>
  );
}
