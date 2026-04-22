# Guía de Configuración: Google OAuth en SmartSPG

Esta guía explica cómo configurar Google OAuth para SmartSPG usando Supabase Auth en Vercel.

---

## 1. Habilitar Google en Supabase Dashboard

1. Accede a tu proyecto Supabase: `https://app.supabase.com/`
2. Ve a **Authentication → Providers → Google**
3. Haz clic en **Enable Google provider**
4. Verás dos campos vacíos donde pegar el **Client ID** y **Client Secret** (los obtendrás de Google Cloud Console)
5. Copia los dos redirect URLs que Supabase sugiere:
   - `https://sztdkdillrbdslpisjil.supabase.co/auth/v1/callback` (CRÍTICO para Supabase)
   - `https://<tu-dominio-vercel>/auth/callback` (para el app en Vercel)

**Nota:** Supabase gestiona el intercambio OAuth con Google, así que la URL de Supabase es obligatoria.

---

## 2. Crear OAuth 2.0 Client ID en Google Cloud Console

### Paso 1: Acceder a Google Cloud Console
1. Ve a `https://console.cloud.google.com/`
2. Selecciona tu proyecto (o crea uno nuevo)

### Paso 2: Habilitar Google+ API
1. Ve a **APIs & Services → Library**
2. Busca "Google+ API"
3. Haz clic en **Enable**

### Paso 3: Crear credenciales OAuth
1. Ve a **APIs & Services → Credentials**
2. Haz clic en **+ Create Credentials → OAuth 2.0 Client ID**
3. Si es la primera vez, verás "You need to create a consent screen first"
   - Haz clic en **Create OAuth consent screen**
   - Elige **External** como tipo de usuario
   - Completa el formulario:
     - **App name:** SmartSPG
     - **User support email:** tu email
     - **Developer contact:** tu email
   - Haz clic en **Save and Continue** y luego **Save and Continue** de nuevo
   - Vuelve a **Credentials**

### Paso 4: Configurar URIs autorizadas
En la pantalla "Create OAuth 2.0 Client ID":
- **Application type:** Web application
- **Name:** SmartSPG OAuth
- **Authorized JavaScript origins (Originating URIs):**
  ```
  https://smart-proposal-generator-lyart.vercel.app
  https://localhost:3000
  ```
- **Authorized redirect URIs:**
  ```
  https://sztdkdillrbdslpisjil.supabase.co/auth/v1/callback
  ```

### Paso 5: Copiar credenciales
1. Haz clic en **Create**
2. Verás un modal con tu **Client ID** y **Client Secret**
3. Copia ambos valores

---

## 3. Pegar credenciales en Supabase

1. Vuelve a Supabase Dashboard → **Authentication → Providers → Google**
2. Pega el **Client ID** en el campo "Client ID"
3. Pega el **Client Secret** en el campo "Client Secret"
4. Haz clic en **Save**

✅ Google OAuth está habilitado en Supabase.

---

## 4. Configurar NEXT_PUBLIC_SUPABASE_ANON_KEY

1. Ve a Supabase Dashboard → **Settings → API**
2. Copia la **anon public key**
3. En tu archivo `.env.local` (root o `apps/web/.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://sztdkdillrbdslpisjil.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key_aqui>
   ```

**IMPORTANTE:** La `ANON_KEY` es pública (comienza con "NEXT_PUBLIC_"), usa solo en el navegador para operaciones autenticadas como sign-in y sign-up.

---

## 5. Variables de entorno en Vercel

Cuando despliegues a Vercel, añade estas variables:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sztdkdillrbdslpisjil.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `DATABASE_URL` | Connection string con pooler (si usas Server Actions) |
| `ANTHROPIC_API_KEY` | Tu API key de Anthropic |

**Para obtener la connection string:**
1. Supabase Dashboard → **Settings → Database → Connection pooling**
2. Copia la string de **Session Mode** (recomendado para Next.js)

---

## 6. Auth: Email + Google

Supabase tiene autenticación por email **habilitada por defecto**. Dos opciones:

### Opción A: Email integrado (Recomendado para testing)
- Usa el servicio SMTP por defecto de Supabase
- Los usuarios reciben links de confirmación en su email
- Sin configuración adicional

### Opción B: Email personalizado (Producción)
1. Supabase Dashboard → **Authentication → Email**
2. Habilita **Custom SMTP**
3. Configura con Resend u otro proveedor:
   - **SMTP Host:** `smtp.resend.com`
   - **SMTP Port:** `587`
   - **SMTP User:** `default` (si usas Resend)
   - **SMTP Password:** Tu API key de Resend

---

## 7. Flujo de autenticación en la app

### En desarrollo (localhost:3000)

```
1. Usuario abre http://localhost:3000/sign-in
2. Hace clic en "Continuar con Google"
3. Se redirige a: https://sztdkdillrbdslpisjil.supabase.co/auth/v1/oauth/authorize
4. Google consent screen aparece
5. Usuario autoriza
6. Google redirige a Supabase (https://sztdkdillrbdslpisjil.supabase.co/auth/v1/callback)
7. Supabase procesa el token y redirige a: http://localhost:3000/auth/callback
8. La app valida la sesión y redirige a: /dashboard
```

### En producción (Vercel)

```
Lo mismo, pero el inicio es: https://tu-app.vercel.app/sign-in
```

---

## 8. Testing local

### Verificar que todo funciona:

1. **Clonar el repo e instalar dependencias:**
   ```bash
   git clone <repo>
   cd smart-proposal-generator
   pnpm install
   ```

2. **Crear `.env.local` en `apps/web/`:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://sztdkdillrbdslpisjil.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key>
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   pnpm --filter web dev
   ```

4. **Abre http://localhost:3000/sign-in**
   - Verás botón "Continuar con Google"
   - Haz clic y sigue el flujo de autorización
   - Deberías regresar a `/dashboard` autenticado

5. **Si algo falla:**
   - Verifica la consola del navegador (DevTools → Console)
   - Revisa que `NEXT_PUBLIC_SUPABASE_ANON_KEY` no esté vacía
   - En Supabase Dashboard → **Logs**, busca errores de OAuth

---

## 9. Troubleshooting

| Problema | Solución |
|----------|----------|
| "Error: redirect_uri_mismatch" | Asegúrate que la URI en Google Cloud Console coincida exactamente: `https://sztdkdillrbdslpisjil.supabase.co/auth/v1/callback` |
| "Invalid ANON_KEY" | Copia la key nuevamente desde Supabase Settings → API |
| "localhost:3000 not working" | Verifica que `http://localhost:3000` esté en "Authorized JavaScript origins" en Google Cloud Console |
| "Email confirmation stuck" | Usa "Custom SMTP" en Supabase con Resend |
| OAuth button no aparece | Verifica que `apps/web/app/[locale]/(auth)/sign-in/page.tsx` existe y importa el componente GoogleSignIn |

---

## 10. Comandos útiles

```bash
# Desarrollo
pnpm --filter web dev

# Build para Vercel
pnpm build

# Linter
pnpm lint

# Tests
pnpm --filter web test:e2e
```

---

## Referencia rápida

- **Supabase Project Ref:** `sztdkdillrbdslpisjil`
- **Supabase URL:** `https://sztdkdillrbdslpisjil.supabase.co`
- **Google OAuth Callback:** `https://sztdkdillrbdslpisjil.supabase.co/auth/v1/callback`
- **Vercel Redirect:** `https://<tu-dominio-vercel>/auth/callback`

---

**Última actualización:** 21 de abril de 2026
