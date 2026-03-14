const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
export type Product = { id: string; shopId: string; name: string; description: string; category?: string; price?: number; inStock?: boolean; imageUrl?: string; createdAt: string };
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) { const text = await response.text(); throw new Error(text || `Request failed with ${response.status}`); }
  return (await response.json()) as T;
}
export async function fetchProducts(shopId: string): Promise<Product[]> {
  const res = await fetch(`${backendUrl}/api/shops/${shopId}/products`, { cache: "no-store" });
  return handleResponse<Product[]>(res);
}
export async function updateProduct(shopId: string, productId: string, patch: Partial<Omit<Product, "id" | "shopId" | "createdAt">>): Promise<Product> {
  const res = await fetch(`${backendUrl}/api/shops/${shopId}/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  return handleResponse<Product>(res);
}
export async function deleteProduct(shopId: string, productId: string): Promise<void> {
  const res = await fetch(`${backendUrl}/api/shops/${shopId}/products/${productId}`, { method: "DELETE" });
  if (!res.ok) { const text = await res.text(); throw new Error(text || `Delete failed with ${res.status}`); }
}
export async function reorderProducts(shopId: string, id: string, toIndex: number): Promise<Product[]> {
  const res = await fetch(`${backendUrl}/api/shops/${shopId}/products/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, toIndex }) });
  return handleResponse<Product[]>(res);
}
