# RAG Module – Jewellery Inventory

Minimal production-style **RAG (Retrieval-Augmented Generation)** for a jewellery inventory app: user asks in natural language (e.g. *"show white bridal necklace under 1000"*), the system retrieves real items from the DB and returns a natural-language answer grounded only in those items.

## Tech stack

- **Node.js + TypeScript** (ESM)
- **Supabase** (Postgres + pgvector)
- **OpenAI** (text-embedding-3-small, gpt-4o-mini)
- **Express** for `POST /api/query`

## Env vars

Create a `.env` (or export) in `apps/rag`:

```bash
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Optional: `PORT=4001` (default 4001).

## Setup

### 1. Run schema and seed (Supabase)

In **Supabase Dashboard → SQL Editor** (or psql), run in order:

1. **Schema** – creates `vector` extension, `rag_products`, `rag_product_embeddings`, and `match_products()` (rag_* tables allow same DB as main app):

```bash
# From repo root, schema is at:
apps/rag/src/db/schema.sql
```

Copy the contents of `schema.sql` and run it in Supabase.

2. **Seed** – inserts 15 sample jewellery rows into `rag_products`:

```bash
apps/rag/src/db/seed.sql
```

Copy and run `seed.sql` in Supabase.

> This schema uses `rag_products` and `rag_product_embeddings` so it can run in the same Supabase project as the main catalogue app.

### 2. Install and build

```bash
cd apps/rag
npm install
npm run build
```

### 3. Reindex embeddings

After schema + seed, generate and upsert embeddings for all products:

```bash
npm run reindex
```

This fetches all rows from `rag_products`, builds `embedding_text`, calls OpenAI embeddings, and upserts into `rag_product_embeddings`. Run again whenever you add/update products.

### 4. Start the API

```bash
npm run dev
# or
npm start
```

Server listens on `http://localhost:4001`.

## API

**POST /api/query**

- **Request body:** `{ "query": "show red bridal earrings under 1000" }`
- **Response:**

```json
{
  "answerText": "Here are some red bridal earrings under ₹1000: ...",
  "products": [
    {
      "id": "uuid",
      "title": "Red Kundan Bridal Earrings",
      "price": 750,
      "stock_qty": 5,
      "category": "Earrings",
      "stone_color": "red"
    }
  ],
  "debug": {
    "appliedFilters": {
      "category": "Earrings",
      "subcategory": "Bridal",
      "maxPrice": 1000,
      "stoneColor": "red",
      "occasion": "Bridal"
    },
    "retrievalCount": 3
  }
}
```

### cURL example

```bash
curl -X POST http://localhost:4001/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "red bridal earrings under 1000"}'
```

## Acceptance test scenarios

| Query | Expected behaviour |
|-------|--------------------|
| `red bridal earrings under 1000` | Red, bridal, earrings, price ≤ 1000 |
| `daily wear necklace around 700` | Necklace, daily, price ~700 |
| `show green stones jhumka` | Green stone, jhumka earrings |
| `diamond look set below 2000` | White/diamond-look set, price &lt; 2000 |
| No-match query | Safe fallback message, no invented products |

## Why this is RAG

- **Retrieve:** The user’s query is parsed into filters (category, max price, stone color, occasion) and turned into an embedding. We run a **vector similarity search** in Postgres (pgvector) using `match_products(query_embedding, ...)` on `rag_product_embeddings` / `rag_products` so we get the most relevant **real** inventory rows (plus optional filters). If that returns nothing, we fall back to a simple SQL filter on the same tables. So the answer is always grounded in **retrieved rows only**.
- **Augment:** The list of retrieved products (id, title, price, stock, category, stone_color) is injected into the **system prompt** as the only allowed inventory. The model is instructed not to invent any product, price, or stock.
- **Generate:** The model (gpt-4o-mini) generates a short, natural-language reply using only that list. So the consumer gets a conversational answer that stays faithful to your DB and never hallucinates SKUs or availability.

End-to-end: **query → parse filters → query embedding → match_products (or fallback) → top 12 → prompt with product list → chat completion → answerText + products + debug.**

## File tree

```
apps/rag/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts              # Express server, mounts POST /api/query
    ├── types.ts              # Product, QueryFilters, RAGResponse, etc.
    ├── db/
    │       ├── schema.sql        # vector, rag_products, rag_product_embeddings, match_products()
    │   └── seed.sql          # 15 sample jewellery rows
    ├── lib/
    │   ├── openai.ts         # OpenAI client, EMBEDDING_MODEL, CHAT_MODEL
    │   ├── db.ts             # Supabase client
    │   ├── embeddings.ts     # buildEmbeddingText, getEmbedding, upsertProductEmbedding
    │   └── queryParser.ts    # parseQueryFilters (regex/rules)
    ├── prompts/
    │   └── inventoryRagPrompt.ts   # buildSystemPrompt, buildUserMessage
    ├── services/
    │   ├── retrieval.ts      # retrieveProducts (embed → match_products → fallback)
    │   └── rag.ts            # answerInventoryQuery → RAGResponse
    ├── routes/
    │   └── query.ts          # POST /api/query
    └── scripts/
        └── reindexEmbeddings.ts   # Fetch all products, re-embed, upsert
```

## Key SQL: `match_products`

```sql
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1536),
  match_count int DEFAULT 12,
  category_filter text DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  stone_color_filter text DEFAULT NULL,
  occasion_filter text DEFAULT NULL
)
RETURNS TABLE (
  product_id uuid, title text, category text, subcategory text,
  stone_color text, occasion text, price numeric, description text,
  stock_qty int, similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.category, p.subcategory, p.stone_color,
         p.occasion, p.price, p.description, p.stock_qty,
         1 - (pe.embedding <=> query_embedding) AS similarity
  FROM rag_product_embeddings pe
  JOIN rag_products p ON p.id = pe.product_id
  WHERE (category_filter IS NULL OR p.category ILIKE '%' || category_filter || '%')
    AND (max_price IS NULL OR p.price <= max_price)
    AND (stone_color_filter IS NULL OR p.stone_color ILIKE '%' || stone_color_filter || '%')
    AND (occasion_filter IS NULL OR p.occasion ILIKE '%' || occasion_filter || '%')
    AND p.stock_qty > 0
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## Sample API response (query #1: "red bridal earrings under 1000")

```json
{
  "answerText": "We have these red bridal earrings under ₹1000: 1) Red Kundan Bridal Earrings – ₹750, 5 in stock. 2) Red Stone Bridal Choker – ₹950, 1 in stock (necklace). Would you like details on any of these?",
  "products": [
    { "id": "a1000001-0001-4000-8000-000000000002", "title": "Red Kundan Bridal Earrings", "price": 750, "stock_qty": 5, "category": "Earrings", "stone_color": "red" },
    { "id": "a1000001-0001-4000-8000-000000005", "title": "Red Stone Bridal Choker", "price": 950, "stock_qty": 1, "category": "Necklace", "stone_color": "red" }
  ],
  "debug": {
    "appliedFilters": { "category": "Earrings", "subcategory": "Bridal", "maxPrice": 1000, "stoneColor": "red", "occasion": "Bridal" },
    "retrievalCount": 2
  }
}
```

## Retrieval + generation flow (brief)

1. **POST /api/query** receives `{ "query": "red bridal earrings under 1000" }`.
2. **parseQueryFilters** extracts `category: "Earrings"`, `subcategory: "Bridal"`, `maxPrice: 1000`, `stoneColor: "red"`, `occasion: "Bridal"`.
3. **getEmbedding(query)** returns a 1536-dim vector (OpenAI text-embedding-3-small).
4. **match_products(query_embedding, 12, ...)** runs in Postgres: cosine similarity + filters, returns top 12 rows with `similarity`.
5. If that’s empty, **fallbackFilteredProducts(filters)** does a plain SQL filter on `products` and returns up to 12.
6. **buildSystemPrompt(products)** builds a system prompt that lists only these products and instructs the model not to invent anything.
7. **openai.chat.completions.create** (gpt-4o-mini) returns **answerText**.
8. Response is **{ answerText, products: summaries, debug }**.
