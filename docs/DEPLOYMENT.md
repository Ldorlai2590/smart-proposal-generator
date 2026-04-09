# SmartSPG — Guia de Despliegue

## Parte 1: Hacer funcionar Sign-In / Sign-Up en LOCAL

### Paso 1: Configurar Clerk Dashboard

1. Ve a [dashboard.clerk.com](https://dashboard.clerk.com) e inicia sesion
2. Selecciona tu aplicacion (o crea una nueva)
3. En **Configure > Social connections**: activa Google y/o GitHub
4. En **Configure > Email, Phone, Username**: activa Email + Password
5. En **Configure > Organizations**: ACTIVAR organizaciones (es obligatorio para multi-tenancy)
6. En **Configure > Paths**:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/dashboard`
   - After sign-up URL: `/dashboard`
7. En **Configure > Webhooks**: crear un endpoint:
   - URL: `https://TU-DOMINIO/api/webhooks/clerk` (para local usa ngrok, ver Paso 3)
   - Events: `organization.created`, `organizationMembership.created`
   - Copia el **Signing Secret** → sera tu `CLERK_WEBHOOK_SECRET`

### Paso 2: Variables de entorno (.env.local)

Verifica que `apps/web/.env.local` tenga estos valores correctos:

```bash
# Clerk (copia de tu dashboard → API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # ← ya lo tienes
CLERK_SECRET_KEY=sk_test_...                    # ← ya lo tienes
CLERK_WEBHOOK_SECRET=whsec_...                  # ← del paso anterior

# URLs de Clerk
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Base de datos (tu Supabase ya esta configurado)
DATABASE_URL=postgresql://...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Paso 3: Webhooks en local (ngrok)

Los webhooks de Clerk necesitan una URL publica. Usa ngrok:

```bash
# Instalar ngrok (una sola vez)
brew install ngrok   # macOS
# o descarga de https://ngrok.com/download

# Exponer puerto 3000
ngrok http 3000
```

Ngrok te dara una URL tipo `https://abc123.ngrok-free.app`. Usa esa URL en el webhook de Clerk:
`https://abc123.ngrok-free.app/api/webhooks/clerk`

### Paso 4: Ejecutar migraciones

```bash
# Crear las tablas en Supabase
cd apps/api
uv run alembic upgrade head
```

### Paso 5: Arrancar el proyecto

```bash
# Desde la raiz del proyecto
pnpm install
pnpm dev
```

Abre `http://localhost:3000` — deberas ver la landing page. Click en "Registrate gratis" para crear una cuenta.

### Flujo completo de registro:

1. Usuario llega a `/sign-up` → panel con branding + formulario Clerk
2. Clerk crea el usuario → redirige a `/select-org`
3. Usuario crea una organizacion → Clerk dispara webhook `organization.created`
4. Webhook crea el tenant en PostgreSQL con trial de 30 dias
5. Redirige a `/onboarding` (wizard de 5 pasos)
6. Al completar onboarding → redirige a `/dashboard`

---

## Parte 2: Desplegar en HuggingFace Spaces

### Paso 1: Crear el Space

1. Ve a [huggingface.co/new-space](https://huggingface.co/new-space)
2. Configuracion:
   - **Owner**: tu usuario (ej: `Ldorlai2590`)
   - **Space name**: `smart-proposal-gen`
   - **SDK**: Docker
   - **Hardware**: CPU basic (gratis) — suficiente para Next.js
   - **Visibility**: Private (recomendado mientras desarrollas)

### Paso 2: Configurar Secrets en HF

En tu Space → Settings → Variables and secrets, agrega estos **secrets**:

| Secret | Valor | Notas |
|--------|-------|-------|
| `CLERK_SECRET_KEY` | `sk_test_...` | De tu dashboard Clerk |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Para generacion de propuestas con IA |
| `DATABASE_URL` | `postgresql://...` | URL de Supabase (pooler) |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | Del webhook de Clerk |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Cuando lo tengas configurado |
| `RESEND_API_KEY` | `re_...` | Cuando lo tengas configurado |

### Paso 3: Actualizar Clerk para la URL de HF

En Clerk Dashboard:
1. Ve a **Configure > Domains**
2. Agrega: `https://Ldorlai2590-smart-proposal-generator.hf.space`
3. Actualiza el webhook URL a: `https://Ldorlai2590-smart-proposal-generator.hf.space/api/webhooks/clerk`

### Paso 4: Subir el codigo a HuggingFace

```bash
# Opcion A: Push directo via git
git remote add hf https://huggingface.co/spaces/Ldorlai2590/smart-proposal-gen
git push hf main

# Opcion B: Desde GitHub con sync automatico
# En HF Space → Settings → Repository → Link a GitHub repo
```

### Paso 5: Verificar el despliegue

1. HF construira la imagen Docker automaticamente (~5-10 min la primera vez)
2. Ve los logs en: Space → Logs
3. Una vez "Running", abre: `https://Ldorlai2590-smart-proposal-generator.hf.space`
4. Deberas ver la landing page
5. Prueba el flujo completo: registro → onboarding → dashboard → crear propuesta

### Troubleshooting comun en HF

- **Build falla por pnpm-lock.yaml**: asegurate de que el lockfile esta commiteado
- **Error de Clerk**: verifica que la URL del Space esta en los dominios permitidos de Clerk
- **502 Bad Gateway**: revisa los logs, probablemente falta un secret
- **Puerto incorrecto**: el Dockerfile ya esta configurado para puerto 7860 (requerido por HF)

---

## Resumen: Que necesitas tener configurado

| Servicio | Estado | Accion |
|----------|--------|--------|
| Clerk | Ya tienes keys | Activar Organizations + crear webhook |
| Supabase (DB) | Ya tienes URL | Ejecutar migraciones (`alembic upgrade head`) |
| Anthropic | Ya tienes key | Listo para generar propuestas |
| Stripe | Pendiente | Crear cuenta test en stripe.com cuando quieras billing |
| Resend | Pendiente | Crear cuenta en resend.com cuando quieras emails |
| DocuForge | Pendiente | Crear cuenta en getdocuforge.dev para export PDF |
| ngrok | Necesario para local | `brew install ngrok` + exponer puerto 3000 |

---

## Checklist rapido para primer despliegue

- [ ] Clerk: organizaciones activadas
- [ ] Clerk: webhook endpoint creado con los 2 events
- [ ] Clerk: dominio de HF agregado (si aplica)
- [ ] Supabase: migraciones ejecutadas
- [ ] .env.local: todas las variables con valores reales
- [ ] `pnpm install` exitoso
- [ ] `pnpm dev` arranca sin errores
- [ ] Puedes ver `/sign-up` y crear cuenta
- [ ] Webhook crea tenant en DB
- [ ] Onboarding completo redirige a dashboard
