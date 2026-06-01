# Fase 1 — Estabilización: PDF + Redis + Auto-save + DB Pooling

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar los 4 puntos de fallo que impiden escalar a 1000 usuarios: PDF roto (Puppeteer), rate limit inútil (in-memory), data loss en Step4 (sin auto-save), y DB collapse (sin connection pooling).

**Architecture:** Reemplazar Puppeteer/Chromium por llamada HTTP a DocuForge API; reemplazar el Map en memoria de `rate-limit.ts` por Upstash Redis con la misma interfaz `checkLimit`; agregar un Server Action `useAutoSave` en Step4; configurar Supabase Transaction Pooler (pgBouncer) como variable de entorno.

**Tech Stack:** Next.js 16 App Router, Upstash Redis (`@upstash/redis`), DocuForge REST API, Supabase Transaction Pooler, Vitest para unit tests, variables de entorno en `apps/web/.env.local`.

---

## Archivos a modificar / crear

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `apps/web/lib/rate-limit.ts` | Modificar | Swap in-memory → Upstash Redis, misma API `checkLimit` |
| `apps/web/app/api/proposals/export/route.ts` | Modificar | Swap Puppeteer → DocuForge fetch en `handlePDF` |
| `apps/web/app/api/proposals/autosave/route.ts` | Crear | Server Action POST para persistir secciones editadas |
| `apps/web/components/wizard/Step4Review.tsx` | Modificar | Agregar hook `useAutoSave` que dispara cada 30s |
| `apps/web/lib/autosave.ts` | Crear | Hook `useAutoSave(sections, proposalId)` |
| `apps/web/package.json` | Modificar | Agregar `@upstash/redis`, remover `@sparticuz/chromium` y `puppeteer-core` |
| `.env.local` (documentación) | — | Variables nuevas: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DOCUFORGE_API_KEY` |

---

## Task 1: Migrar PDF export a DocuForge API

**Files:**
- Modify: `apps/web/app/api/proposals/export/route.ts:310-353` (función `handlePDF`)
- Modify: `apps/web/package.json` (remover Puppeteer/Chromium, no agregar nada nuevo)

### Contexto

La función actual lanza Chromium (~50MB) dentro de una Vercel Function, lo que produce 500 errors frecuentes y consume demasiada memoria. DocuForge es el servicio definido en CLAUDE.md para este propósito.

El endpoint de DocuForge: `POST https://api.getdocuforge.dev/v1/pdf`
Body esperado: `{ html: string }` (o `{ url: string }` — usamos `html` para evitar URLs públicas)
Headers: `Authorization: Bearer <DOCUFORGE_API_KEY>`, `Content-Type: application/json`
Response: binary PDF o JSON `{ url: string }` según el plan.

- [ ] **Step 1: Verificar que DOCUFORGE_API_KEY está disponible en `.env.local`**

Abrir `apps/web/.env.local` y confirmar que existe la línea:
```
DOCUFORGE_API_KEY=tu_key_aqui
```
Si no existe, añadirla. Si no tienes key, obtenerla en https://getdocuforge.dev.

- [ ] **Step 2: Escribir el test unitario para `handlePDF` con DocuForge**

Crear `apps/web/__tests__/export-pdf.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch global
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock env
vi.stubEnv('DOCUFORGE_API_KEY', 'test-key-123')

describe('PDF export via DocuForge', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('calls DocuForge API with HTML body and returns PDF binary', async () => {
    const fakePdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF magic bytes
    mockFetch.mockResolvedValueOnce(
      new Response(fakePdfBytes.buffer, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    )

    // We test the exported helper, not the full route, to keep it unit-level
    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    const result = await generatePDFFromHTML('<html><body>Test</body></html>')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.getdocuforge.dev/v1/pdf')
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body as string)
    expect(body.html).toContain('<html>')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(0x25) // %
  })

  it('throws Error when DocuForge returns non-2xx', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"invalid key"}', { status: 401 })
    )

    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    await expect(generatePDFFromHTML('<html>test</html>')).rejects.toThrow('DocuForge 401')
  })
})
```

- [ ] **Step 3: Ejecutar el test para verificar que falla (módulo no existe aún)**

```bash
pnpm --filter web test __tests__/export-pdf.test.ts
```
Salida esperada: `Error: Cannot find module '@/lib/pdf-docuforge'`

- [ ] **Step 4: Crear `apps/web/lib/pdf-docuforge.ts`**

```typescript
export async function generatePDFFromHTML(html: string): Promise<Uint8Array> {
  const apiKey = process.env.DOCUFORGE_API_KEY
  if (!apiKey) throw new Error('DOCUFORGE_API_KEY not set')

  const res = await fetch('https://api.getdocuforge.dev/v1/pdf', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ html }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DocuForge ${res.status}: ${text}`)
  }

  const buffer = await res.arrayBuffer()
  return new Uint8Array(buffer)
}
```

- [ ] **Step 5: Ejecutar el test para verificar que pasa**

```bash
pnpm --filter web test __tests__/export-pdf.test.ts
```
Salida esperada: `✓ calls DocuForge API... ✓ throws Error when...` (2 passed)

- [ ] **Step 6: Reemplazar `handlePDF` en `apps/web/app/api/proposals/export/route.ts`**

Localizar la función `handlePDF` (líneas ~310-353) y reemplazarla completamente:

```typescript
async function handlePDF(
  input: ExportRequest,
  orgId: string,
): Promise<Response> {
  const brand = await loadBranding(orgId)
  const html = buildProposalHTML(input.sections, brand)

  try {
    const { generatePDFFromHTML } = await import('@/lib/pdf-docuforge')
    const pdfBytes = await generatePDFFromHTML(html)

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="propuesta-${input.proposalId || 'draft'}.pdf"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[export/pdf] DocuForge failed:', msg)
    return jsonResponse({ error: 'PDF generation failed. Please try again.' }, 500)
  }
}
```

- [ ] **Step 7: Eliminar imports de Puppeteer y Chromium del route**

Al inicio de `apps/web/app/api/proposals/export/route.ts`, eliminar las líneas:
```typescript
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
```

- [ ] **Step 8: Remover dependencias pesadas de `apps/web/package.json`**

En `apps/web/package.json`, eliminar de `"dependencies"`:
```json
"@sparticuz/chromium": "^148.0.0",
"puppeteer-core": "^25.0.4",
```

Luego ejecutar:
```bash
pnpm install
```

- [ ] **Step 9: Verificar que el build compila sin errores**

```bash
pnpm --filter web type-check
```
Salida esperada: sin errores de TypeScript.

- [ ] **Step 10: Commit**

```bash
git add apps/web/lib/pdf-docuforge.ts apps/web/app/api/proposals/export/route.ts apps/web/package.json apps/web/__tests__/export-pdf.test.ts pnpm-lock.yaml
git commit -m "feat(export): migrate PDF generation from Puppeteer to DocuForge API"
```

---

## Task 2: Rate limiting con Upstash Redis

**Files:**
- Modify: `apps/web/lib/rate-limit.ts` (swap Map → Redis, misma API pública)
- Modify: `apps/web/package.json` (agregar `@upstash/redis`)

### Contexto

El `store = new Map()` actual es local a cada instancia de Vercel Function. En serverless, Vercel puede levantar N instancias simultáneas; cada una tiene su propio contador. Un atacante puede superar el límite haciendo N requests a instancias distintas.

Upstash Redis es serverless-native, factura por request (no por instancia), y tiene latencia ~1ms desde Vercel Edge. Usaremos `INCR` con `EXPIRE` para el patrón de ventana fija (lo suficientemente preciso para rate limiting de abuso).

Variables necesarias en `.env.local`:
```
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```
Obtener en https://console.upstash.com → crear database → REST API → copiar URL y token.

- [ ] **Step 1: Instalar `@upstash/redis`**

```bash
pnpm --filter web add @upstash/redis
```
Salida esperada: `+ @upstash/redis@...` en el output de pnpm.

- [ ] **Step 2: Escribir test para el nuevo checkLimit con Redis**

Crear `apps/web/__tests__/rate-limit-redis.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @upstash/redis before importing rate-limit
vi.mock('@upstash/redis', () => {
  const pipelineResult = { incr: vi.fn(), expire: vi.fn(), exec: vi.fn() }
  const redisMock = {
    pipeline: vi.fn(() => pipelineResult),
    get: vi.fn(),
  }
  return { Redis: vi.fn(() => redisMock), __redisMock: redisMock, __pipelineResult: pipelineResult }
})

vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io')
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')

describe('Redis-backed checkLimit', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns allowed:true when count is below limit', async () => {
    const { __redisMock, __pipelineResult } = await import('@upstash/redis') as any
    __pipelineResult.exec.mockResolvedValueOnce([1, 1]) // count=1 after INCR

    const { checkLimit } = await import('@/lib/rate-limit')
    const result = await checkLimit('1.2.3.4', 'proposals:stream', 3, 60)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('returns allowed:false when count exceeds limit', async () => {
    const { __pipelineResult } = await import('@upstash/redis') as any
    __pipelineResult.exec.mockResolvedValueOnce([4, 1]) // count=4 > limit=3

    const { checkLimit } = await import('@/lib/rate-limit')
    const result = await checkLimit('1.2.3.4', 'proposals:stream', 3, 60)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Ejecutar test para verificar que falla**

```bash
pnpm --filter web test __tests__/rate-limit-redis.test.ts
```
Salida esperada: falla porque `rate-limit.ts` aún no usa Redis.

- [ ] **Step 4: Reemplazar `apps/web/lib/rate-limit.ts` completamente**

```typescript
/**
 * Redis-backed sliding-window rate limiter via Upstash.
 *
 * Uses fixed-window INCR+EXPIRE per (ip, key) composite.
 * Shared across all Vercel Function instances — global enforcement.
 *
 * Fallback: if Redis is unavailable (env vars missing), returns allowed:true
 * with a warning so the app keeps working in local dev without Redis.
 */
import { Redis } from '@upstash/redis'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter: number
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function checkLimit(
  ip: string,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const redis = getRedis()

  // Local dev fallback: no Redis configured → allow all
  if (!redis) {
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — rate limiting disabled')
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(Date.now() + windowSec * 1000),
      retryAfter: 0,
    }
  }

  const compositeKey = `rl:${ip}:${key}`
  const resetAt = new Date(Date.now() + windowSec * 1000)

  const pipeline = redis.pipeline()
  pipeline.incr(compositeKey)
  pipeline.expire(compositeKey, windowSec)
  const results = await pipeline.exec() as [number, number]
  const count = results[0]

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: windowSec,
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfter: 0,
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xri = req.headers.get('x-real-ip')
  if (xri) return xri.trim()
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  return 'unknown'
}

/** Test-only helper. */
export function __resetRateLimitStoreForTests(): void {}
```

- [ ] **Step 5: Actualizar el call-site en `stream/route.ts` para `await`**

En `apps/web/app/api/proposals/stream/route.ts`, línea ~76-77, el `checkLimit` ahora es async. Actualizar:

```typescript
// antes (síncrono)
const rl = checkLimit(ip, RATE_LIMIT_KEY, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC)

// después (async)
const rl = await checkLimit(ip, RATE_LIMIT_KEY, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC)
```

- [ ] **Step 6: Ejecutar tests para verificar que pasan**

```bash
pnpm --filter web test __tests__/rate-limit-redis.test.ts
```
Salida esperada: `✓ returns allowed:true... ✓ returns allowed:false...` (2 passed)

- [ ] **Step 7: Verificar que el build compila sin errores**

```bash
pnpm --filter web type-check
```
Salida esperada: sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/rate-limit.ts apps/web/app/api/proposals/stream/route.ts apps/web/__tests__/rate-limit-redis.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(rate-limit): replace in-memory Map with Upstash Redis for cross-instance enforcement"
```

---

## Task 3: Auto-save en Step4

**Files:**
- Create: `apps/web/lib/autosave.ts`
- Create: `apps/web/app/api/proposals/autosave/route.ts`
- Modify: `apps/web/components/wizard/Step4Review.tsx`

### Contexto

`Step4Review.tsx` línea 44 tiene `const [_isSaving] = useState(false)` — variable prefijada con `_` porque el auto-save nunca fue implementado. El CLAUDE.md especifica "Auto-save cada 30s via Server Action". Implementamos el hook + endpoint.

El auto-save solo guarda las `sections` editadas. No necesita guardar el estado completo del wizard (el `proposalId` ya está en DB desde Step3).

- [ ] **Step 1: Escribir test para el endpoint `/api/proposals/autosave`**

Crear `apps/web/__tests__/autosave-route.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock requireAuth
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ tenantId: 'tenant-abc', userId: 'user-1', email: 'test@test.com' }),
}))

// Mock supabase admin
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    })),
  })),
}))

describe('POST /api/proposals/autosave', () => {
  it('returns 200 when sections are saved', async () => {
    const { POST } = await import('@/app/api/proposals/autosave/route')
    const req = new Request('http://localhost/api/proposals/autosave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: 'prop-123',
        sections: { portada: '<p>Test portada</p>' },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.saved).toBe(true)
  })

  it('returns 400 for missing proposalId', async () => {
    const { POST } = await import('@/app/api/proposals/autosave/route')
    const req = new Request('http://localhost/api/proposals/autosave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: { portada: '<p>Test</p>' } }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

```bash
pnpm --filter web test __tests__/autosave-route.test.ts
```
Salida esperada: `Error: Cannot find module` (el route no existe aún)

- [ ] **Step 3: Crear `apps/web/app/api/proposals/autosave/route.ts`**

```typescript
import { z } from 'zod/v4'

export const runtime = 'nodejs'
export const maxDuration = 10

const AutosaveSchema = z.object({
  proposalId: z.string().min(1),
  sections: z.record(z.string(), z.string()),
})

export async function POST(req: Request): Promise<Response> {
  let tenantId: string
  try {
    const { requireAuth } = await import('@/lib/auth')
    const session = await requireAuth()
    tenantId = session.tenantId
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const parsed = AutosaveSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid request', issues: parsed.error.issues }), { status: 400 })
  }

  const { proposalId, sections } = parsed.data

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  const { error } = await admin
    .from('proposals')
    .update({ sections, updated_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[autosave] Supabase update failed:', error.message)
    return new Response(JSON.stringify({ error: 'Save failed' }), { status: 500 })
  }

  return new Response(JSON.stringify({ saved: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 4: Ejecutar test para verificar que pasa**

```bash
pnpm --filter web test __tests__/autosave-route.test.ts
```
Salida esperada: `✓ returns 200... ✓ returns 400...` (2 passed)

- [ ] **Step 5: Crear `apps/web/lib/autosave.ts`**

```typescript
'use client'

import { useEffect, useRef } from 'react'

const AUTOSAVE_INTERVAL_MS = 30_000

interface AutosaveOptions {
  proposalId: string
  sections: Record<string, string>
  onSaveStart?: () => void
  onSaveEnd?: (error: Error | null) => void
}

/**
 * Fires a POST to /api/proposals/autosave every 30s.
 * Skips save if proposalId is empty (proposal not yet persisted).
 */
export function useAutoSave({ proposalId, sections, onSaveStart, onSaveEnd }: AutosaveOptions) {
  const sectionsRef = useRef(sections)

  // Keep ref in sync without re-triggering the effect on every keystroke
  useEffect(() => {
    sectionsRef.current = sections
  }, [sections])

  useEffect(() => {
    if (!proposalId) return

    const timer = setInterval(async () => {
      onSaveStart?.()
      try {
        await fetch('/api/proposals/autosave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposalId, sections: sectionsRef.current }),
        })
        onSaveEnd?.(null)
      } catch (err) {
        onSaveEnd?.(err instanceof Error ? err : new Error(String(err)))
      }
    }, AUTOSAVE_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [proposalId, onSaveStart, onSaveEnd])
}
```

- [ ] **Step 6: Integrar `useAutoSave` en `Step4Review.tsx`**

En `apps/web/components/wizard/Step4Review.tsx`:

a) Agregar import al inicio del archivo:
```typescript
import { useAutoSave } from '@/lib/autosave'
```

b) Reemplazar la línea 44:
```typescript
// antes
const [_isSaving] = useState(false)

// después
const [isSaving, setIsSaving] = useState(false)
```

c) Después de la declaración de `editedSections` (aproximadamente línea 43), agregar el hook:
```typescript
useAutoSave({
  proposalId,
  sections: editedSections,
  onSaveStart: () => setIsSaving(true),
  onSaveEnd: () => setIsSaving(false),
})
```

d) En el JSX del header del documento (aproximadamente línea 173, después de la fecha), agregar el indicador de guardado:
```tsx
{isSaving && (
  <p className="text-[#94A3B8] text-xs mt-1">Guardando...</p>
)}
```

- [ ] **Step 7: Verificar que el build compila sin errores**

```bash
pnpm --filter web type-check
```
Salida esperada: sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/autosave.ts apps/web/app/api/proposals/autosave/route.ts apps/web/components/wizard/Step4Review.tsx apps/web/__tests__/autosave-route.test.ts
git commit -m "feat(autosave): implement 30s auto-save for Step4 proposal sections"
```

---

## Task 4: Supabase Connection Pooler (configuración)

**Files:**
- Modify: `apps/web/.env.local` — cambiar `DATABASE_URL` al endpoint Transaction Pooler
- No hay cambios de código — Drizzle y Supabase JS usan la URL del env var

### Contexto

Con conexión directa (puerto 5432), cada Vercel Function abre 1 conexión a PostgreSQL. El plan Pro de Supabase tiene límite de ~100 conexiones directas. A ~80 funciones serverless concurrentes, nuevas conexiones empiezan a fallar.

Transaction Pooler de Supabase (pgBouncer, puerto 6543) mantiene un pool de conexiones persistentes hacia PostgreSQL y reutiliza conexiones entre invocaciones serverless. Esto permite miles de clientes concurrentes con sólo ~20 conexiones reales a la DB.

**No se necesita cambiar código** — solo la URL de conexión.

- [ ] **Step 1: Obtener la URL de Transaction Pooler**

1. Ir a https://supabase.com/dashboard → tu proyecto → Settings → Database
2. En la sección **Connection string**, seleccionar **Transaction** (no Session, no Direct)
3. Copiar la URI completa. Luce así:
   ```
   postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
4. Nota: el puerto es **6543**, NO 5432.

- [ ] **Step 2: Actualizar `apps/web/.env.local`**

Reemplazar el valor de `DATABASE_URL`:
```bash
# antes (conexión directa)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres

# después (Transaction Pooler — pgBouncer)
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

- [ ] **Step 3: Agregar `?pgbouncer=true` al final de la URL si usas DrizzleORM**

DrizzleORM con `postgres` driver necesita el hint para deshabilitar prepared statements (no soportados en Transaction Pooler):
```
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

- [ ] **Step 4: Verificar conexión localmente**

```bash
pnpm --filter web dev
```
Abrir http://localhost:3000 e iniciar sesión. Si el dashboard carga = la conexión al pooler funciona.

- [ ] **Step 5: Agregar la variable en Vercel**

```bash
# Si tienes Vercel CLI instalado:
vercel env add DATABASE_URL production

# Si no, ir a https://vercel.com/dashboard → proyecto → Settings → Environment Variables
# Actualizar DATABASE_URL con la URL del Transaction Pooler
```

- [ ] **Step 6: Documentar en README del proyecto**

En `apps/web/.env.local.example` (o donde tengas el template de variables), actualizar:
```bash
# PostgreSQL via Supabase Transaction Pooler (pgBouncer) — puerto 6543
# Obtener en: Supabase Dashboard → Settings → Database → Connection string → Transaction
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/.env.local.example
git commit -m "docs(db): use Supabase Transaction Pooler URL for serverless connection pooling"
```

---

## Resumen de variables de entorno nuevas

Agregar en `apps/web/.env.local` y en Vercel Dashboard (Settings → Environment Variables):

```bash
# Upstash Redis — rate limiting global
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# DocuForge — generación de PDF
DOCUFORGE_API_KEY=xxx

# Supabase Transaction Pooler — reemplaza la URL directa
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## Self-Review

**Cobertura del spec:**
- ✅ PDF → DocuForge (Task 1)
- ✅ Rate limit → Upstash Redis (Task 2)
- ✅ Auto-save Step4 (Task 3)
- ✅ DB Connection Pooler (Task 4)
- ⚠️ DOCX export (FastAPI no desplegado) — **fuera del scope de este plan**, requiere infra separada (Railway/Render deploy). Pendiente Fase 1.5.

**Placeholder scan:** ninguno detectado. Cada step tiene código real o comandos con salida esperada.

**Type consistency:**
- `checkLimit` firma cambia de `sync → async`. Actualizado en el call-site de `stream/route.ts` (Task 2, Step 5). ✅
- `useAutoSave` exportado desde `lib/autosave.ts` e importado en `Step4Review.tsx`. ✅
- `generatePDFFromHTML` exportado desde `lib/pdf-docuforge.ts` e importado dinámicamente en `export/route.ts`. ✅
