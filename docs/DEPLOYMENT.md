# SmartSPG — Guía de Despliegue

## Parte 1: Configuración Local con Supabase Auth

### Paso 1: Configurar Supabase Auth

1. Ve a tu proyecto Supabase: `https://app.supabase.com/`
2. En **Authentication → Providers**:
   - Habilita **Google** (ver `docs/GOOGLE-AUTH-SETUP.md` para configuración OAuth)
   - Email está habilitado por defecto
3. En **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (desarrollo) y `https://smart-proposal-generator-lyart.vercel.app` (producción)
4. En **Settings → API**:
   - Copia tu **anon public key** y **project URL**

### Paso 2: Variables de entorno (.env.local)

Crea o verifica que `apps/web/.env.local` tenga estos valores:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  # anon public key

# Base de datos (para Server Actions)
DATABASE_URL=postgresql://postgres:PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Nota:** Las variables `NEXT_PUBLIC_*` son públicas (visibles en el navegador). Nunca metas secrets reales en ellas.

### Paso 3: Ejecutar migraciones

Crea las tablas en tu base de datos PostgreSQL:

```bash
cd apps/api
uv run alembic upgrade head
```

Si es la primera vez, esto crea todas las tablas necesarias (clients, proposals, exports, embeddings, etc.).

### Paso 4: Arrancar el proyecto

```bash
# Desde la raíz del proyecto
pnpm install
pnpm dev
```

Abre `http://localhost:3000` — deberás ver la landing page. Haz clic en "Registrate gratis" para crear una cuenta.

### Flujo completo de registro (local):

1. Usuario llega a `/sign-up` → panel con email/Google
2. Elige "Continuar con Google" o usa email + código de verificación
3. Supabase crea el usuario en `auth.users`
4. Después de autenticarse, la app redirige a `/dashboard`
5. El dashboard carga las propuestas del usuario autenticado

**Testing local sin Google:** Usa `http://localhost:3000/sign-up` con cualquier email. Supabase envía un magic link (o código si está configurado).

---

## Parte 2: Desplegar en Vercel

### Paso 1: Conectar GitHub a Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Selecciona tu repositorio `smart-proposal-generator`
3. Haz clic en **Import**

Vercel detectará automáticamente que es un monorepo Turborepo y configurará el root y packages correctamente.

### Paso 2: Configurar Environment Variables en Vercel

En el formulario "Environment Variables" de Vercel, agrega:

| Variable | Valor | Notas |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` | De Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | anon public key |
| `DATABASE_URL` | `postgresql://...` | Connection string con pooler (Session Mode) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Tu API key de Anthropic |
| `STRIPE_SECRET_KEY` | `sk_test_...` | (opcional) si tienes billing |
| `RESEND_API_KEY` | `re_...` | (opcional) para emails |
| `DOCUFORGE_API_KEY` | `...` | (opcional) para export PDF |

**Importante:** No metas valores que empiezan con `NEXT_PUBLIC_` en variables privadas. Las variables privadas nunca llegan al navegador; las públicas sí.

### Paso 3: Actualizar Supabase para Vercel

En tu proyecto Supabase:
1. Ve a **Authentication → URL Configuration**
2. Agrega a "Redirect URLs" (lista):
   - `https://smart-proposal-generator-lyart.vercel.app/auth/callback`
   - `https://smart-proposal-generator-lyart.vercel.app/sign-in`

3. Ve a **Settings → API** y asegúrate de que tu anon key está visible (para `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Paso 4: Deploy automático

1. Haz `git push origin main` desde tu máquina local
2. Vercel detecta el push en GitHub automáticamente
3. El deploy comienza (~3-5 min)
4. Una vez listo, abre `https://smart-proposal-generator-lyart.vercel.app`

Puedes ver el estado del deploy en tu dashboard de Vercel o en el comentario de Vercel Bot en tu GitHub PR.

### Paso 5: Verificar el despliegue

1. Abre `https://smart-proposal-generator-lyart.vercel.app`
2. Verás la landing page
3. Haz clic en "Registrate gratis"
4. Prueba registro con Google o email
5. Después de autenticarte, deberías acceder a `/dashboard`
6. Prueba crear una propuesta: Clientes → Crear cliente → Propuestas → Generar propuesta

### Troubleshooting en Vercel

| Problema | Solución |
|----------|----------|
| "500 Internal Server Error" | Revisa Vercel Logs → verifica que todas las env vars están setadas |
| "Supabase connection refused" | Verifica `DATABASE_URL` en Vercel + que tu IP está whitelistada en Supabase |
| "Google OAuth error" | Verifica que la redirect URL está en Supabase → URL Configuration |
| "CSS no se carga" | Verifica `postcss.config.mjs` existe y Tailwind v4 está configurado |
| Deploy se cuelga en "building" | Probablemente falta una env var critical. Revisa el build log. |

---

## Comparación: Local vs Vercel

| Aspecto | Local | Vercel |
|--------|-------|--------|
| Auth | Supabase Auth (email/Google) | Supabase Auth (email/Google) |
| Base de datos | PostgreSQL (Supabase) | PostgreSQL (Supabase) |
| URLs Supabase | `http://localhost:3000` | `https://smart-proposal-generator-lyart.vercel.app` |
| Webhooks | No necesarios | No necesarios (Supabase maneja auth) |
| Secretos | `.env.local` local | Vercel Environment Variables |
| AI Streaming | Funciona igual | Funciona igual (Vercel serverless) |
| PDF Export | Funciona igual | Funciona igual (DocuForge API) |

---

## Checklist rápido para primer despliegue

### Local
- [ ] Supabase project creado y URL copiada
- [ ] Google OAuth configurado en Supabase (ver `docs/GOOGLE-AUTH-SETUP.md`)
- [ ] `.env.local` completo con Supabase + Anthropic keys
- [ ] Migraciones ejecutadas: `alembic upgrade head`
- [ ] `pnpm install` exitoso
- [ ] `pnpm dev` arranca sin errores
- [ ] Puedes ver `/sign-up` y crear cuenta con email/Google
- [ ] Dashboard carga y muestra propuestas

### Vercel
- [ ] GitHub repo conectado a Vercel
- [ ] Environment Variables configuradas en Vercel
- [ ] Supabase: redirect URLs agregadas para Vercel domain
- [ ] `git push origin main` dispara deploy automático
- [ ] Deploy completa sin errores (3-5 min)
- [ ] Vercel domain accesible y muestra landing page
- [ ] Sign-up/Sign-in funciona con email/Google
- [ ] Dashboard y generación de propuestas funcionan
