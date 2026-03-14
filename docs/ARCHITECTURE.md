# Catalogue Agent — Architecture

High-level architecture for the AI-powered catalogue generator (monorepo: Next.js frontend, NestJS backend, OpenAI GPT-4o, Supabase).

---

## 1. System context

```mermaid
flowchart LR
  subgraph Users
    Owner[Shop owner]
    Visitor[Catalogue visitor]
  end

  subgraph System["Catalogue Agent"]
    direction TB
    Web[Web app]
  end

  Owner -->|Upload photos, manage products| Web
  Visitor -->|Browse catalogue| Web
  Web -->|REST API| Backend[Backend API]
  Web -->|Static/SSR| Frontend[Frontend]
  Backend -->|Vision + extraction| OpenAI[OpenAI GPT-4o]
  Backend -->|Persist products| Supabase[(Supabase)]
```

- **Shop owner**: Uses the app to upload shelf photos, get AI-generated product entries, and manage the catalogue (edit, reorder, share).
- **Catalogue visitor**: Opens the public catalogue (e.g. `/[shopSlug]`), searches and filters, views products.
- **Web app**: Next.js frontend (landing, dashboard, public catalogue) and NestJS backend (API only).
- **External services**: OpenAI (GPT-4o) for image → product extraction; Supabase for product/shop data.

---

## 2. Container diagram

```mermaid
flowchart TB
  subgraph Frontend["Frontend (Next.js)"]
    Landing["/ — Landing"]
    Dashboard["/dashboard — Owner dashboard"]
    Public["/[shopSlug] — Public catalogue"]
    API_Client["API client (lib/api)"]
    Landing --> API_Client
    Dashboard --> API_Client
    Public --> API_Client
  end

  subgraph Backend["Backend (NestJS)"]
    ProductsController[ProductsController]
    ProductsService[ProductsService]
    OpenAIService[OpenAIService]
    ProductsController --> ProductsService
    ProductsService --> OpenAIService
    ProductsService --> Supabase
  end

  subgraph External["External services"]
    OpenAI[OpenAI GPT-4o]
    Supabase[(Supabase)]
  end

  API_Client -->|HTTP REST| ProductsController
  ProductsService --> Supabase
  OpenAIService -->|Chat Completions + image| OpenAI
```

- **Frontend**: Three main surfaces — landing (upload → generate), dashboard (table CRUD, reorder, share link), public catalogue (grid, search, category filters). All backend access via `lib/api`.
- **Backend**: Single module (Products); controller exposes REST; service orchestrates OpenAI and Supabase.
- **External**: OpenAI for image-to-product extraction; Supabase for persistence.

---

## 3. Backend component diagram

```mermaid
flowchart LR
  subgraph API["API layer"]
    PC[ProductsController]
  end

  subgraph Domain["Domain"]
    PS[ProductsService]
  end

  subgraph Integrations["Integrations"]
    OpenAI[OpenAIService]
  end

  subgraph Data["Data"]
    SB[Supabase client]
  end

  PC --> PS
  PS --> OpenAI
  PS --> SB
```

| Component | Responsibility |
|-----------|----------------|
| **ProductsController** | REST: `GET/POST /shops/:shopId/products`, `POST from-images`, `PATCH/DELETE :productId`, `POST reorder`. |
| **ProductsService** | List by shop, create drafts from images (orchestrate OpenAI), update, delete, reorder; maps to/from DB. |
| **OpenAIService** | Send image + prompt to GPT-4o; parse JSON `{ products: [{ name, description, category }] }` → `DetectedProductDraft[]`. |
| **Supabase** | Tables: `products` (and shop identity). Admin client via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. |

---

## 4. Data flow — Generate catalogue from images

```mermaid
sequenceDiagram
  participant U as Owner (browser)
  participant F as Frontend
  participant B as Backend
  participant O as OpenAI GPT-4o
  participant S as Supabase

  U->>F: Select images
  F->>F: Create object URLs (preview)
  F->>B: POST /api/shops/:shopId/products/from-images (multipart)
  B->>B: For each image:
  B->>O: Chat Completions (image + prompt, response_format: json_object)
  O-->>B: { products: [{ name, description, category }] }
  B->>B: Flatten drafts, build rows
  B->>S: INSERT products
  S-->>B: Rows inserted
  B-->>F: Product[] (created)
  F-->>U: Show generated cards + "Open dashboard"
```

- One API call per upload batch; backend calls GPT-4o once per image, then inserts all products in one go.
- Frontend shows skeletons while waiting, then product cards (and optional “Open dashboard” primary action).

---

## 5. Data flow — Dashboard (manage products)

```mermaid
flowchart LR
  subgraph Frontend
    Table[Product table]
    Actions[Add / Edit / Delete / Drag reorder]
    Share[Copy link, WhatsApp]
  end

  subgraph Backend
    List[GET .../products]
    Update[PATCH .../products/:id]
    Delete[DELETE .../products/:id]
    Reorder[POST .../products/reorder]
  end

  Table --> List
  Actions --> Update
  Actions --> Delete
  Actions --> Reorder
  List --> Table
  Update --> Table
  Reorder --> List
```

- Dashboard loads products with `GET /shops/:shopId/products`, then uses PATCH/DELETE/POST reorder for edits. Share uses the public catalogue URL and optional WhatsApp link.

---

## 6. Data flow — Public catalogue

```mermaid
flowchart LR
  Visitor[Visitor] --> Page["/[shopSlug]"]
  Page --> GET[GET /api/shops/:shopSlug/products]
  GET --> Supabase[(Supabase)]
  Page --> Filter[Client-side: search + category]
  Filter --> Grid[Product grid]
```

- Public page fetches products once by `shopSlug` (same as `shopId` in API). Search and category filters are client-side.

---

## 7. Key configuration

| Layer | Key config |
|-------|------------|
| **Frontend** | `NEXT_PUBLIC_BACKEND_URL` (API base, e.g. `http://localhost:4000`) |
| **Backend** | `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT` (default 4000) |
| **Supabase** | Tables used: `products` (and any shop/tenant fields). Backend uses service role for server-side access. |

---

## 8. File layout (relevant paths)

```
apps/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing: upload → generate → cards
│   │   ├── dashboard/page.tsx    # Owner: table, CRUD, reorder, share
│   │   ├── [shopSlug]/page.tsx   # Public catalogue
│   │   ├── layout.tsx
│   │   └── lib/api.ts            # Backend API client
│   └── components/ui/            # Button, Skeleton, etc.
│
└── backend/
    └── src/
        ├── main.ts
        ├── app.module.ts
        ├── config/supabase.client.ts
        ├── integrations/openai.service.ts   # GPT-4o extraction
        └── products/
            ├── products.module.ts
            ├── products.controller.ts
            └── products.service.ts
```

This document describes the current architecture; update it when adding new modules (e.g. auth, multi-shop) or changing integrations.
