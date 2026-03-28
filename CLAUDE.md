# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Smart Proposal Generator** — SaaS multi-tenant de generación de propuestas comerciales con IA para el mercado LATAM. Flujo core: analizar cliente → generar propuesta con Claude → exportar PDF/DOCX/HTML. Billing: Free / Pro / Enterprise (metered por propuestas generadas).

---

## Monorepo Structure (Turborepo + pnpm workspaces)

```
smart-proposal-generator/
├── apps/
│   ├── web/                          # Next.js 16 (App Router)
│   │   ├── app/
│   │   │   ├── (auth)/               # Sign-in / sign-up (Clerk)
│   │   │   ├── (dashboard)/
│   │   │   │   ├── clients/
│   │   │   │   ├── proposals/
│   │   │   │   └── analytics/
│   │   │   └── api/proposals/stream/ # Route Handler AI (streamObject)
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui + Aceternity + Magic UI
│   │   │   ├── wizard/               # Wizard 4 pasos
│   │   │   ├── editor/               # TipTap 3
│   │   │   └── ai/                   # Streaming components
│   │   └── lib/
│   │       ├── ai.ts                 # Vercel AI SDK config
│   │       ├── db.ts                 # DrizzleORM client
│   │       └── auth.ts               # Clerk helpers
│   └── api/                          # FastAPI
│       ├── app/
│       │   ├── main.py
│       │   ├── core/
│       │   │   ├── config.py
│       │   │   ├── database.py       # SQLAlchemy 2.0 async engine
│       │   │   ├── redis.py
│       │   │   └── security.py       # Tenant middleware
│       │   ├── modules/
│       │   │   ├── clients/          # commands.py, queries.py, handlers.py, models.py, router.py
│       │   │   ├── proposals/        # + events.py
│       │   │   └── exports/          # pdf.py (DocuForge), docx.py
│       │   └── shared/
│       │       ├── tenant.py         # tenant_id extraction + enforcement
│       │       └── schemas.py
│       ├── tests/
│       ├── alembic/
│       └── pyproject.toml
├── packages/
│   ├── ui/                           # Componentes compartidos
│   ├── types/src/                    # proposal.ts, client.ts, tenant.ts
│   └── prompts/                      # proposal-generator.yaml, client-analysis.yaml
├── infra/
│   └── docker-compose.yml
├── turbo.json
└── package.json
```

---

## Commands

### Root
```bash
pnpm install
pnpm dev          # web (:3000) + api (:8000) en paralelo
pnpm build
pnpm test
pnpm lint
```

### Frontend (apps/web)
```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web typecheck    # tsc --noEmit
pnpm --filter web test         # Vitest
pnpm --filter web test:e2e     # Playwright
```

### Backend (apps/api)
```bash
cd apps/api
uv run uvicorn app.main:app --reload --port 8000
uv run pytest -v --cov=app
uv run pytest tests/test_foo.py
uv run pytest -k "test_name"
uv run ruff check .
uv run ruff format .
uv run mypy .
```

### Base de Datos
```bash
# DrizzleORM — solo apps/web
pnpm --filter db db:generate
pnpm --filter db db:migrate
pnpm --filter db db:studio

# Alembic — solo apps/api
cd apps/api
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "descripcion"
uv run alembic downgrade -1

# Docker
docker compose -f infra/docker-compose.yml up -d postgres redis
docker compose -f infra/docker-compose.yml up -d
docker exec -it spg_postgres psql -U spg_user -d spg_db
```

---

## Architecture

### Multi-Tenancy
`tenant_id` obligatorio en **todas** las tablas. Clerk usa `orgId` como `tenant_id`. El `orgId` del JWT viaja al backend vía header `X-Tenant-ID`. Todo `shared/tenant.py` lo extrae y aplica.

```sql
-- CORRECTO — siempre tenant_id primero
SELECT * FROM proposals WHERE tenant_id = $1 AND id = $2;

-- PROHIBIDO — data leak
SELECT * FROM proposals WHERE id = $1;
```

### Two-ORM Setup
| Capa | ORM | Migrations |
|------|-----|------------|
| `apps/web` (TypeScript) | DrizzleORM | drizzle-kit |
| `apps/api` (Python) | SQLAlchemy 2.0 async + asyncpg | Alembic |

Ambos apuntan al mismo PostgreSQL. Nunca usar Prisma.

### AI Engine — Flujo completo
```
Browser
  → useObject() hook (Vercel AI SDK)
  → apps/web/app/api/proposals/stream/route.ts   ← ÚNICA entrada a la IA
      → streamObject({ model: anthropic('claude-sonnet-4-5'), schema, messages })
          → Anthropic API (via SDK, nunca fetch directo)
  → apps/api (FastAPI) — guarda propuesta generada en PostgreSQL
```

**Prompt Caching** — obligatorio en system prompts de propuesta:
```typescript
import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod/v4'

const result = streamObject({
  model: anthropic('claude-sonnet-4-5'),
  schema: ProposalSchema,
  messages: [
    {
      role: 'system',
      content: [{
        type: 'text',
        text: systemPrompt,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      }],
    },
    { role: 'user', content: userPrompt },
  ],
})
return result.toTextStreamResponse()
```

### Backend CQRS (apps/api)
Cada módulo tiene: `commands.py` (escritura) | `queries.py` (lectura) | `handlers.py` | `events.py` | `models.py` | `router.py`. Nunca mezclar lógica de lectura y escritura en el mismo handler. Events disparan: email via Resend, webhooks.

### Frontend — Wizard 4 pasos (flujo core)

**Paso 1 — Cliente**
- Buscar/seleccionar cliente existente o crear inline
- Output: `client_id` + score de oportunidad
- Siguiente: habilitado solo cuando `client_id` presente

**Paso 2 — Contexto**
- Campos: problema (textarea), budget (slider), timeline (datepicker), template base (cards por industria)
- Siguiente: habilitado cuando problema + template seleccionados

**Paso 3 — Generación IA (streaming)**
- `useObject()` de Vercel AI SDK → POST `/api/proposals/stream`
- Magic UI shimmer mientras carga → check verde al completar cada sección
- Secciones en orden: resumen ejecutivo → problema → solución → alcance → timeline → inversión → próximos pasos
- Siguiente: habilitado cuando `isLoading === false` y todas las secciones presentes

**Paso 4 — Revisión & Export**
- TipTap 3 con toolbar, secciones colapsables y reordenables
- Export: PDF (DocuForge) | DOCX (python-docx) | Email (Resend + React Email)
- Auto-save cada 30s via Server Action

---

## Critical Rules

### 1. Zod 4
```typescript
import { z } from 'zod/v4'   // CORRECTO — siempre v4
import { z } from 'zod'      // PROHIBIDO — puede resolver a v3, rompe AI SDK 4
```

### 2. Vercel AI SDK — Solo Route Handlers
```typescript
// CORRECTO — apps/web/app/api/proposals/stream/route.ts
export async function POST(req: Request) {
  const result = streamObject({ model: anthropic('claude-sonnet-4-5'), schema: ProposalSchema })
  return result.toTextStreamResponse()
}

// PROHIBIDO — nunca en 'use client'
'use client'
const result = await streamObject(...)  // expone API key
```

### 3. Tailwind v4
```css
/* globals.css — CORRECTO */
@import "tailwindcss";
@theme { --color-brand: #1D9E75; }
/* NO crear tailwind.config.js — NO usar @tailwind base; */
```

### 4. PDF export
```python
# CORRECTO
async with httpx.AsyncClient() as client:
    response = await client.post("https://api.getdocuforge.dev/v1/pdf", ...)

# PROHIBIDO
from weasyprint import HTML  # nunca
```

### 5. Sin fetch directo a Anthropic
```typescript
// PROHIBIDO en cualquier archivo del repo
fetch('https://api.anthropic.com/v1/messages', ...)
new Anthropic({ apiKey }).messages.create(...)
```

---

## PostgreSQL Schema Base

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE tenants (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_org_id  VARCHAR(255) UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    plan          VARCHAR(50) DEFAULT 'free',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    email         VARCHAR(255) NOT NULL,
    role          VARCHAR(50) DEFAULT 'member',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    company       VARCHAR(255),
    email         VARCHAR(255),
    industry      VARCHAR(100),
    company_size  VARCHAR(50),
    score         INTEGER DEFAULT 0,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);

CREATE TABLE proposals (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id     UUID NOT NULL REFERENCES clients(id),
    created_by    UUID NOT NULL REFERENCES users(id),
    title         VARCHAR(500),
    status        VARCHAR(50) DEFAULT 'draft',
    template_id   VARCHAR(100),
    context       JSONB DEFAULT '{}',
    sections      JSONB DEFAULT '{}',
    tokens_used   INTEGER DEFAULT 0,
    model         VARCHAR(100),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX idx_proposals_client ON proposals(client_id);

CREATE TABLE proposal_embeddings (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    proposal_id   UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,
    embedding     vector(1536),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_embeddings_tenant ON proposal_embeddings(tenant_id);

CREATE TABLE exports (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    proposal_id   UUID NOT NULL REFERENCES proposals(id),
    format        VARCHAR(20) NOT NULL,
    file_url      TEXT,
    status        VARCHAR(50) DEFAULT 'pending',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Docker Compose (infra/docker-compose.yml)

```yaml
version: '3.9'
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: spg_postgres
    environment:
      POSTGRES_USER: spg_user
      POSTGRES_PASSWORD: spg_pass
      POSTGRES_DB: spg_db
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: spg_redis
    ports: ["6379:6379"]

  api:
    build: ./apps/api
    container_name: spg_api
    environment:
      DATABASE_URL: postgresql+asyncpg://spg_user:spg_pass@postgres:5432/spg_db
      REDIS_URL: redis://redis:6379
    ports: ["8000:8000"]
    depends_on: [postgres, redis]
    volumes:
      - ./apps/api:/app

volumes:
  postgres_data:
```

---

## Key Integrations

| Servicio | Propósito | Env vars |
|----------|-----------|----------|
| Clerk | Auth + multi-tenant (`orgId` = `tenant_id`) | `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Anthropic | Claude via Vercel AI SDK | `ANTHROPIC_API_KEY` |
| Stripe | Billing + metered usage | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Resend | Emails transaccionales | `RESEND_API_KEY` |
| DocuForge | Export PDF | `DOCUFORGE_API_KEY` |
| Apitally | API monitoring (FastAPI) | `APITALLY_CLIENT_ID` |

### Environment Files
```
apps/web/.env.local   # NEXT_PUBLIC_* + server-only (Clerk, Anthropic, Stripe)
apps/api/.env         # Python vars (DB, Redis, Resend, DocuForge, Apitally)
infra/.env            # Docker Compose overrides
```

---

## Testing

- **Frontend**: Vitest (unit) + Playwright (e2e)
- **Backend**: pytest + httpx async client
- Tests de integración usan PostgreSQL real vía Docker — no mockear la DB
- AI: `vi.mock('@ai-sdk/anthropic')` en unit tests del wizard
