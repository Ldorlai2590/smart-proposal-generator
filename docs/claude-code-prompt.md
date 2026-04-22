# Prompt para Claude Code

Pega esto dentro de Claude Code (en la raíz del repo `smart-proposal-generator`) para que ejecute el flujo completo de push y tests E2E en Vercel.

---

## PROMPT

Estás en la raíz del monorepo **Smart Proposal Generator** (Turborepo + pnpm, Next.js 16 + FastAPI). Tu objetivo es **publicar los commits pendientes y luego correr la suite Playwright E2E contra el deployment en Vercel**, mostrando el resultado paso a paso.

### Contexto

- Branch: `main`
- Hay commits locales sin push que arreglan:
  1. `postcss.config.mjs` faltante (Tailwind v4 CSS no se generaba — app sin estilos)
  2. Null-byte padding en `apps/web/app/(dashboard)/analytics/page.tsx` y `dashboard/page.tsx` (Turbopack rompía el build)
  3. Suite E2E nueva en `apps/web/e2e/` con 2 usuarios Playwright en paralelo
- Remote configurado: `origin` (GitHub)
- Vercel despliega automáticamente desde GitHub al hacer push a `main`
- App disponible en `https://smart-proposal-generator-lyart.vercel.app`
- Supabase Auth está configurado con Google OAuth
- Todas las secrets (ANTHROPIC_API_KEY, DATABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.) ya están en Vercel Environment Variables

### Tareas — ejecuta en orden y reporta resultado de cada una

1. **Verificar estado del repo**
   - `git status` — debe estar limpio o sólo con archivos untracked que no afectan
   - `git log --oneline -5` — mostrar los últimos commits
   - Confirmar que existen: `apps/web/postcss.config.mjs`, `apps/web/playwright.config.ts`, `apps/web/e2e/user-a-tech-consulting.spec.ts`, `apps/web/e2e/user-b-marketing-agency.spec.ts`

2. **Push a GitHub**
   - `git push origin main`
   - Si falla por autenticación, pausar y pedir al usuario el token/credenciales. NO usar `--force` bajo ninguna circunstancia.

3. **Esperar deploy de Vercel**
   - Polling con `curl -sI https://smart-proposal-generator-lyart.vercel.app` cada 15 segundos hasta recibir HTTP 200
   - Timeout máximo: 5 minutos (Vercel suele ser más rápido que HF Spaces)
   - Mostrar el tiempo total que tardó el deploy

4. **Smoke test de CSS**
   - `curl -s https://smart-proposal-generator-lyart.vercel.app | grep -o 'href="[^"]*\.css[^"]*"' | head -5`
   - Hacer `curl -sI` al primer CSS link y verificar Content-Type `text/css` + tamaño > 10KB
   - Si el CSS es < 10KB, significa que Tailwind sigue sin procesarse — detener y alertar

5. **Preparar Playwright**
   - `cd apps/web`
   - `pnpm install` si es necesario
   - `pnpm exec playwright install chromium` (solo Chromium, no todos los browsers)

6. **Correr los 2 usuarios en paralelo**
   - Comando:
     ```bash
     BASE_URL=https://smart-proposal-generator-lyart.vercel.app \
       pnpm exec playwright test --reporter=list
     ```
   - Capturar stdout/stderr completos
   - NO usar `--headed` (estás en CLI sin display)

7. **Reportar resultado**
   - Si pasaron los 2: mostrar ✅ y ruta al reporte HTML (`playwright-report/index.html`)
   - Si falló alguno: extraer el step que rompió de cada spec, el error message, y adjuntar la ruta al screenshot del último paso exitoso (`test-results/screenshots/*.png`)
   - Copiar los traces a una carpeta clara: `test-results/traces/`

### Reglas

- **Nunca** modificar el código del proyecto para hacer pasar un test — los tests son el oráculo de verdad; si fallan es un bug real que se reporta al usuario.
- Si un paso tarda más de lo esperado (>5 min), reportar progreso en vez de colgarse en silencio.
- No commits, no pushes extra, no PR — solo el push del paso 2.

### Output esperado al terminar

Un resumen como:

```
━━━ RESULTADO ━━━
Push origin:         ✅ (commits abc1234 + def5678 + ghi9012)
Vercel deploy:       ✅ (3m 15s)
CSS smoke:           ✅ (bundle 87KB)
Playwright install:  ✅
Usuario A:           ✅  (6 pasos, 42.1s)
Usuario B:           ❌  falló en paso 3 "03-ai-generation"
                     Error: timeout esperando streaming
                     Último screenshot: test-results/screenshots/1234-02-context.png
```
