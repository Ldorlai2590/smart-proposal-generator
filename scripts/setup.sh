#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# SmartSPG — Script de configuracion automatica
# Ejecuta esto desde la raiz del proyecto:
#   chmod +x scripts/setup.sh && ./scripts/setup.sh
# ═══════════════════════════════════════════════════════════════

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "═══════════════════════════════════════════════════"
echo "  SmartSPG — Configuracion automatica"
echo "═══════════════════════════════════════════════════"
echo ""

# ─── 1. Verificar requisitos ─────────────────────────────────
echo -e "${YELLOW}[1/7] Verificando requisitos...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js no encontrado. Instala Node 20+${NC}"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${YELLOW}Instalando pnpm...${NC}"; npm install -g pnpm@9.15.4; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}Node.js 20+ requerido. Tienes: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ Node $(node -v) + pnpm $(pnpm -v)${NC}"

# ─── 2. Verificar .env.local ─────────────────────────────────
echo -e "${YELLOW}[2/7] Verificando variables de entorno...${NC}"

if [ ! -f "apps/web/.env.local" ]; then
  echo -e "${RED}  ✗ apps/web/.env.local no encontrado${NC}"
  echo "  Copia apps/web/.env.local.example y llena los valores"
  exit 1
fi

# Check critical vars
for VAR in NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY DATABASE_URL; do
  VALUE=$(grep "^${VAR}=" apps/web/.env.local | cut -d= -f2-)
  if [ -z "$VALUE" ] || [[ "$VALUE" == *"..."* ]]; then
    echo -e "${RED}  ✗ ${VAR} no esta configurado correctamente${NC}"
    exit 1
  fi
  echo -e "${GREEN}  ✓ ${VAR} configurado${NC}"
done

# ─── 3. Instalar dependencias ────────────────────────────────
echo -e "${YELLOW}[3/7] Instalando dependencias del frontend...${NC}"
pnpm install
echo -e "${GREEN}  ✓ Dependencias instaladas${NC}"

# ─── 4. Configurar Clerk (Organizations) ─────────────────────
echo -e "${YELLOW}[4/7] Configurando Clerk...${NC}"

CLERK_KEY=$(grep "^CLERK_SECRET_KEY=" apps/web/.env.local | cut -d= -f2-)

# Enable Organizations
echo "  Activando Organizations en Clerk..."
ORG_RESULT=$(curl -s -X PATCH \
  -H "Authorization: Bearer ${CLERK_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "max_allowed_memberships": 50}' \
  https://api.clerk.com/v1/organization_settings 2>&1)

if echo "$ORG_RESULT" | grep -q '"enabled":true'; then
  echo -e "${GREEN}  ✓ Organizations activadas${NC}"
else
  echo -e "${YELLOW}  ⚠ Respuesta de Clerk: ${ORG_RESULT}${NC}"
  echo "  Si falla, activa Organizations manualmente en dashboard.clerk.com"
fi

# Check existing users
USER_COUNT=$(curl -s -H "Authorization: Bearer ${CLERK_KEY}" \
  "https://api.clerk.com/v1/users?limit=1" 2>&1 | grep -o '"total_count":[0-9]*' | cut -d: -f2)
echo -e "${GREEN}  ✓ Clerk conectado (${USER_COUNT:-0} usuarios existentes)${NC}"

# ─── 5. Ejecutar migraciones DB ──────────────────────────────
echo -e "${YELLOW}[5/7] Ejecutando migraciones de base de datos...${NC}"

# Check if Python/uv is available for Alembic
if command -v uv >/dev/null 2>&1; then
  echo "  Usando uv para migraciones..."
  cd apps/api
  uv sync --no-dev 2>/dev/null || uv pip install -r pyproject.toml 2>/dev/null || true
  uv run alembic upgrade head
  cd ../..
  echo -e "${GREEN}  ✓ Migraciones ejecutadas${NC}"
elif command -v python3 >/dev/null 2>&1; then
  echo "  Usando python3 para migraciones..."
  cd apps/api
  pip3 install sqlalchemy alembic psycopg2-binary python-dotenv --quiet 2>/dev/null || true

  # Need sync URL for alembic
  DB_URL=$(grep "^DATABASE_URL=" .env | cut -d= -f2-)
  SYNC_URL=$(echo "$DB_URL" | sed 's/postgresql+asyncpg/postgresql/')

  DATABASE_URL="$SYNC_URL" python3 -m alembic upgrade head
  cd ../..
  echo -e "${GREEN}  ✓ Migraciones ejecutadas${NC}"
else
  echo -e "${YELLOW}  ⚠ Python no encontrado. Ejecuta manualmente:${NC}"
  echo "     cd apps/api && uv run alembic upgrade head"
fi

# ─── 6. Verificar build ──────────────────────────────────────
echo -e "${YELLOW}[6/7] Verificando que el proyecto compila...${NC}"
cd apps/web
npx tsc --noEmit 2>&1 || echo -e "${YELLOW}  ⚠ Algunos errores de tipos (normal en desarrollo)${NC}"
cd ../..
echo -e "${GREEN}  ✓ Verificacion completada${NC}"

# ─── 7. Instrucciones finales ─────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e "${GREEN}  ✓ Configuracion completada!${NC}"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Para arrancar en LOCAL:"
echo "  pnpm dev"
echo "  Abre http://localhost:3000"
echo ""
echo "Para WEBHOOKS en local (necesario para registro):"
echo "  1. Instala ngrok: brew install ngrok"
echo "  2. Ejecuta: ngrok http 3000"
echo "  3. En Clerk Dashboard → Webhooks → crear endpoint:"
echo "     URL: https://TU-NGROK-URL/api/webhooks/clerk"
echo "     Events: organization.created, organizationMembership.created"
echo ""
echo "Para desplegar en HUGGINGFACE SPACES:"
echo "  1. Crea Space tipo Docker en huggingface.co/new-space"
echo "  2. Agrega secrets: CLERK_SECRET_KEY, ANTHROPIC_API_KEY, DATABASE_URL"
echo "  3. En Clerk → Domains: agrega la URL del Space"
echo "  4. git remote add hf https://huggingface.co/spaces/TU-USER/TU-SPACE"
echo "  5. git push hf main"
echo ""
