FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YWxpdmUtYm9uZWZpc2gtMTguY2xlcmsuYWNjb3VudHMuZGV2JA
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
ENV NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_APP_URL=https://your-space.hf.space

RUN pnpm --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=7860

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 7860
CMD ["node", "apps/web/server.js"]
