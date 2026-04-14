FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS builder
WORKDIR /app

# Copy everything at once (simpler, avoids workspace resolution issues)
COPY . .

# Install dependencies (no --frozen-lockfile to avoid lockfile mismatch)
RUN pnpm install --no-frozen-lockfile

# ─── Build-time env vars ─────────────────────────────────────
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YWxpdmUtYm9uZWZpc2gtMTguY2xlcmsuYWNjb3VudHMuZGV2JA
ARG NEXT_PUBLIC_APP_URL=https://Giraldo34-smart-proposal-generator.hf.space
ARG NEXT_PUBLIC_API_URL=https://Giraldo34-smart-proposal-generator.hf.space

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
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

# Standalone output includes node_modules (minimal, traced)
COPY --from=builder /app/apps/web/.next/standalone ./

# Static assets: CSS, JS chunks, fonts — MUST be next to server in .next/static
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Public files: favicon, images, etc.
COPY --from=builder /app/apps/web/public ./apps/web/public

# Prompts YAML files
COPY --from=builder /app/packages/prompts ./packages/prompts

# Runtime secrets → set via HF Space Settings → Secrets:
# CLERK_SECRET_KEY, ANTHROPIC_API_KEY, DATABASE_URL,
# STRIPE_SECRET_KEY, RESEND_API_KEY, DOCUFORGE_API_KEY

EXPOSE 7860
CMD ["node", "apps/web/server.js"]
