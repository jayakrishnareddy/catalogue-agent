import { existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env from repo root so OPENAI_API_KEY etc. from .env.local work when running from monorepo
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../.."); // apps/rag/src -> repo root
for (const name of [".env.local", ".env"]) {
  const envPath = join(rootDir, name);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config(); // also load apps/rag/.env or cwd .env if present
