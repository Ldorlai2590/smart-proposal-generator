FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS builder
WORKDIR /app

# Copy workspace config files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all package.json files for workspace resolution
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# ─── Build-time env vars ─────────────────────────────────────
# NEXT_PUBLIC_* MUST be set at build time (baked into JS bundle).
# On HuggingFace Spaces, set these as "Build secrets" or ARGs.
# The CLERK publishable key is PUBLIC (safe to embed in client code).
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YWxpdmUtYm9uZWZpc2gtMTguY2xlcmsuYWNjb3VudHMuZGV2JA
ARG NEXT_PUBLIC_APP_URL=https://Ldorlai2590-smart-proposal-generator.hf.space
ARG NEXT_PUBLIC_API_URL=https://Ldorlai2590-smart-proposal-generator.hf.space

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter web build

# ─── Production runner ─────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

# Standalone output contains everything needed
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# public/ may be empty but must exist for Next.js static file serving
COPY --from=builder /app/apps/web/public ./apps/web/public

# Prompts YAML files — used at runtime by lib/ai.ts
COPY --from=builder /app/packages/prompts ./packages/prompts

# ─── Runtime secrets (set via HF Space Settings → Secrets) ─────
# CLERK_SECRET_KEY          → Clerk server-side auth
# ANTHROPIC_API_KEY         → AI proposal generation
# DATABASE_URL              → PostgreSQL (Supabase pooler)
# STRIPE_SECRET_KEY         → Billing
# STRIPE_WEBHOOK_SECRET     → Stripe webhooks
# RESEND_API_KEY            → Transactional email
# DOCUFORGE_API_KEY         → PDF export

EXPOSE 7860
CMD ["node", "apps/web/server.js"]
