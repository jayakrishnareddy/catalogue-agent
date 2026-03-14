## Catalogue Agent Monorepo

**Goal**: AI-powered catalogue generator for small local shops.

### Stack

- **Frontend**: Next.js (app router, TypeScript, Tailwind, shadcn-style UI primitives)
- **Backend**: NestJS-style structure (TypeScript)
- **Vision + LLM**: OpenAI GPT-4o (image input, structured product extraction)
- **Database**: Supabase

### Structure

- `apps/frontend`: Next.js app for shop owner dashboard + public catalogue
- `apps/backend`: Nest-style API server (`/api`) for product ingestion, AI processing, and catalogue queries

### Root scripts

From the monorepo root:

- **Install deps**: `npm install` (uses workspaces)
- **Run frontend**: `npm run dev:frontend`
- **Run backend**: `npm run dev:backend`

### Env setup

Copy `.env.example` to `.env` and fill:

- **Supabase**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **OpenAI**: `OPENAI_API_KEY` for GPT-4o image-based product extraction

### Next steps (MVP features)

1. Wire `ProductsService` to Supabase tables for shops and products.
2. Add image upload endpoint that uses `OpenAIService` (GPT-4o) to create product drafts from images.
3. Build owner dashboard in `apps/frontend` for reviewing/editing products.
4. Build public catalogue page with search, filters, and WhatsApp share links + Open Graph tags.
