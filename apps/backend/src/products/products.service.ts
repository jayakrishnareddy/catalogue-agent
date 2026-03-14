import { Injectable } from "@nestjs/common";
import type { Express } from "express";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { getSupabaseAdminClient } from "../config/supabase.client";
import { OpenAIService } from "../integrations/openai.service";

const UPLOADS_DIR = join(process.cwd(), "uploads");
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

export interface Product {
  id: string;
  shopId: string;
  name: string;
  description: string;
  category?: string;
  price?: number;
  inStock?: boolean;
  imageUrl?: string;
  stoneColors?: string[];
  model?: string | null;
  createdAt: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly openai: OpenAIService) {}

  async listByShop(shopId: string): Promise<Product[]> {
    const client = getSupabaseAdminClient();

    const { data, error } = await client
      .from("products")
      .select(
        "id, shop_id, name, description, category, price, in_stock, image_url, stone_colors, model, created_at",
      )
      .eq("shop_id", shopId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (
      data?.map((row: any) => ({
        id: row.id,
        shopId: row.shop_id,
        name: row.name,
        description: row.description,
        category: row.category ?? undefined,
        price: row.price ?? undefined,
        inStock: row.in_stock ?? undefined,
        imageUrl: row.image_url ?? undefined,
        stoneColors: Array.isArray(row.stone_colors) ? row.stone_colors : undefined,
        model: row.model ?? undefined,
        createdAt: row.created_at,
      })) ?? []
    );
  }

  /**
   * Saves the image to the local uploads folder and returns the public URL.
   * Files are stored under uploads/{shopId}/{timestamp}-{index}.{ext}
   */
  private async saveImageLocally(
    shopId: string,
    file: Express.Multer.File,
    index: number,
  ): Promise<string | null> {
    const ext = file.mimetype?.includes("png") ? "png" : "jpg";
    const filename = `${Date.now()}-${index}.${ext}`;
    const dir = join(UPLOADS_DIR, shopId);
    const filePath = join(dir, filename);

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, file.buffer);
      return `${BACKEND_URL}/uploads/${shopId}/${filename}`;
    } catch {
      return null;
    }
  }

  async createDraftsFromImages(
    shopId: string,
    files: Express.Multer.File[],
  ): Promise<Product[]> {
    const client = getSupabaseAdminClient();
    const now = new Date().toISOString();

    const results = await Promise.all(
      files.map(async (file, fileIndex) => {
        const mimeType = file.mimetype?.startsWith("image/")
          ? file.mimetype
          : "image/jpeg";
        const [drafts, imageUrl] = await Promise.all([
          this.openai.extractProductsFromImage(file.buffer, mimeType),
          this.saveImageLocally(shopId, file, fileIndex),
        ]);
        return { drafts, imageUrl };
      }),
    );

    let draftIndex = 0;
    const rowsToInsert = results.flatMap(({ drafts, imageUrl }) =>
      drafts.map((draft) => {
        const row = {
          shop_id: shopId,
          name: draft.name,
          description: draft.description,
          category: draft.category ?? null,
          price: null,
          in_stock: null,
          image_url: imageUrl,
          stone_colors: draft.stoneColors && draft.stoneColors.length > 0 ? draft.stoneColors : [],
          model: draft.model ?? null,
          position: draftIndex++,
          created_at: now,
          updated_at: now,
        };
        return row;
      }),
    );

    const { data, error } = await client
      .from("products")
      .insert(rowsToInsert)
      .select(
        "id, shop_id, name, description, category, price, in_stock, image_url, stone_colors, model, created_at",
      );

    if (error) {
      throw error;
    }

    return (
      data?.map((row: any) => ({
        id: row.id,
        shopId: row.shop_id,
        name: row.name,
        description: row.description,
        category: row.category ?? undefined,
        price: row.price ?? undefined,
        inStock: row.in_stock ?? undefined,
        imageUrl: row.image_url ?? undefined,
        stoneColors: Array.isArray(row.stone_colors) ? row.stone_colors : undefined,
        model: row.model ?? undefined,
        createdAt: row.created_at,
      })) ?? []
    );
  }

  async updateProduct(
    shopId: string,
    productId: string,
    patch: Partial<Omit<Product, "id" | "shopId" | "createdAt">>,
  ): Promise<Product> {
    const client = getSupabaseAdminClient();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (patch.name !== undefined) updatePayload.name = patch.name;
    if (patch.description !== undefined)
      updatePayload.description = patch.description;
    if (patch.category !== undefined) updatePayload.category = patch.category;
    if (patch.price !== undefined) updatePayload.price = patch.price;
    if (patch.inStock !== undefined) updatePayload.in_stock = patch.inStock;
    if (patch.imageUrl !== undefined) updatePayload.image_url = patch.imageUrl;
    if (patch.stoneColors !== undefined) updatePayload.stone_colors = patch.stoneColors;
    if (patch.model !== undefined) updatePayload.model = patch.model;

    const { data, error } = await client
      .from("products")
      .update(updatePayload)
      .eq("id", productId)
      .eq("shop_id", shopId)
      .select(
        "id, shop_id, name, description, category, price, in_stock, image_url, stone_colors, model, created_at",
      )
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      description: data.description,
      category: data.category ?? undefined,
      price: data.price ?? undefined,
      inStock: data.in_stock ?? undefined,
      imageUrl: data.image_url ?? undefined,
      stoneColors: Array.isArray(data.stone_colors) ? data.stone_colors : undefined,
      model: data.model ?? undefined,
      createdAt: data.created_at,
    };
  }

  async deleteProduct(shopId: string, productId: string): Promise<void> {
    const client = getSupabaseAdminClient();

    const { error } = await client
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("shop_id", shopId);

    if (error) {
      throw error;
    }
  }

  async reorderProducts(
    shopId: string,
    id: string,
    toIndex: number,
  ): Promise<Product[]> {
    const client = getSupabaseAdminClient();

    // Get current ordered ids
    const { data, error } = await client
      .from("products")
      .select("id")
      .eq("shop_id", shopId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const orderedIds: string[] = (data ?? []).map((row: any) => row.id);
    const fromIndex = orderedIds.indexOf(id);

    if (fromIndex === -1) {
      return this.listByShop(shopId);
    }

    const clampedToIndex = Math.max(
      0,
      Math.min(toIndex, orderedIds.length - 1),
    );

    const copy = [...orderedIds];
    const [item] = copy.splice(fromIndex, 1);
    copy.splice(clampedToIndex, 0, item);

    await Promise.all(
      copy.map((pid, index) =>
        client
          .from("products")
          .update({ position: index, updated_at: new Date().toISOString() })
          .eq("id", pid)
          .eq("shop_id", shopId),
      ),
    );

    return this.listByShop(shopId);
  }
}
