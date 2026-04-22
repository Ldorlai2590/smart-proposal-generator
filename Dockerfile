FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS builder
WORKDIR /app

# Copy everything at once (simpler, avoids workspace resolution issues)
COPY . .

# Install dependencies (no --frozen-lockfile to avoid lockfile mismatch)
RUN pnpm install --no-frozen-lockfile

# ─── Build-time env vars ─────────────────────────────────────
ARG NEXT_PUBLIC_SUPABASE_URL=https://xyzexample.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
ARG NEXT_PUBLIC_APP_URL=https://smart-proposal-generator-lyart.vercel.app
ARG NEXT_PUBLIC_API_URL=https://smart-proposal-generator-lyart.vercel.app

# Demo mode: skip Clerk auth entirely (NEXT_PUBLIC_ must be at build time for client JS)
ARG NEXT_PUBLIC_DEMO_MODE=true
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
ENV DEMO_MODE=true

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Dummy DB URL for build (drizzle-orm import needs it, not used at build time)
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

# Ensure public/ exists
RUN mkdir -p apps/web/public

# Build Next.js (standalone output)
RUN pnpm --filter web build

# ─── Production runner ─────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0
ENV DEMO_MODE=true
ENV NEXT_PUBLIC_DEMO_MODE=true

# Standalone output includes node_modules (minimal, traced)
COPY --from=builder /app/apps/web/.next/standalone ./

# Static assets: CSS, JS chunks, fonts — MUST be next to server in .next/static
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Public files: favicon, images, etc.
COPY --from=builder /app/apps/web/public ./apps/web/public

# Prompts YAML files
COPY --from=builder /app/packages/prompts ./packages/prompts

# Runtime secrets → set via Docker environment or .env file:
# SUPABASE_SERVICE_ROLE_KEY (optional), ANTHROPIC_API_KEY, DATABASE_URL,
# STRIPE_SECRET_KEY, RESEND_API_KEY, DOCUFORGE_API_KEY

EXPOSE 7860
CMD ["node", "apps/web/server.js"]
