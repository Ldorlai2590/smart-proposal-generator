# SmartSPG — E2E Tests

Dos "agentes" Playwright que simulan 2 usuarios reales usando la app en paralelo.

## Qué hace cada uno

| Usuario | Perfil | Cliente que crea | Propuesta |
|---------|--------|------------------|-----------|
| 🔵 **A** — Tech Consulting | Acme Tech Consulting LATAM | FinTech Latam SA (Fintech, 51-200) | Migración COBOL → microservicios AWS, USD 150k, 16 semanas |
| 🟢 **B** — Marketing Agency | Estudio Bruno — Digital Growth | Retail Andino SAS (Retail, 201-500) | Performance marketing full-funnel, USD 45k, 12 semanas |

Cada uno pasa por: landing → signup (Clerk test mode) → onboarding → crear cliente → wizard 4 pasos → listado / analytics.

## Prerequisitos

1. **Clerk en test mode** — la app debe estar usando `pk_test_*`. Los emails con `+clerk_test` bypasean verificación con el código fijo `424242`.
2. **Dev server o HF Space arriba** — con todas las env vars (DB, Anthropic, etc).
3. **Instalar browsers Playwright** (solo la primera vez):
   ```bash
   cd apps/web
   pnpm exec playwright install chromium
   ```

## Cómo correrlos

### Contra HF Space (producción)

```bash
cd apps/web
BASE_URL=https://Giraldo34-smart-proposal-generator.hf.space pnpm test:e2e --headed
```

### Contra localhost (dev)

```bash
# Terminal 1
cd apps/web && pnpm dev

# Terminal 2
cd apps/web
BASE_URL=http://localhost:3000 pnpm exec playwright test --ui
```

### Modos útiles

```bash
# Solo usuario A
pnpm exec playwright test user-a --headed

# Solo usuario B
pnpm exec playwright test user-b --headed

# Con UI interactiva (el mejor modo para ver paso a paso)
pnpm exec playwright test --ui

# Headless con reporte HTML
pnpm exec playwright test
pnpm exec playwright show-report
```

## Qué vas a ver

- **Modo `--headed`**: 2 ventanas de Chromium en paralelo, una por usuario, ejecutándose al mismo tiempo.
- **Modo `--ui`**: panel interactivo de Playwright con timeline, DOM snapshots, network, screenshots de cada paso.
- **`test-results/screenshots/`**: un PNG por cada paso de cada usuario.
- **`playwright-report/index.html`**: reporte HTML con todas las trazas.

## Troubleshooting

- **"locator not visible"** en el form de Clerk → la publishable key probablemente es de producción. Necesita `pk_test_*`.
- **Timeout en Paso 3 (streaming)** → revisar que `ANTHROPIC_API_KEY` esté cargada en el server.
- **"Cliente no aparece en el listado"** → revisar que `DATABASE_URL` del server apunte a una Postgres alcanzable y con migraciones aplicadas.
- **El agente se queda en `/onboarding`** → hay un bug en la lógica de redirect o la Clerk org no se creó. Corre solo el usuario A con `--debug`.
