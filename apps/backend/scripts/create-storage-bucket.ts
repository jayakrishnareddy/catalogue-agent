/**
 * Creates the product-images storage bucket in Supabase.
 * Run from the backend directory:
 *   npx ts-node -r dotenv/config scripts/create-storage-bucket.ts
 * Or from project root:
 *   npx dotenv -e apps/backend/.env -- npx ts-node apps/backend/scripts/create-storage-bucket.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "product-images";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env"
    );
    process.exit(1);
  }

  const client = createClient(url, key, { auth: { persistSession: false } });

  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (exists) {
    console.log(`Bucket "${BUCKET_NAME}" already exists.`);
    return;
  }

  const { data, error } = await client.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
  });

  if (error) {
    console.error("Failed to create bucket:", error.message);
    process.exit(1);
  }

  console.log(`Bucket "${BUCKET_NAME}" created successfully.`);
}

main();
