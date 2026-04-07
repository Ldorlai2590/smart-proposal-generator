---
title: Smart Proposal Generator
emoji: 📄
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
app_port: 7860
---

# Smart Proposal Generator

SaaS de generación de propuestas comerciales con IA para el mercado LATAM.

## Stack
- **Frontend**: Next.js 16, Tailwind v4, shadcn/ui, Clerk Auth
- **AI**: Claude via Vercel AI SDK (streamObject)
- **DB**: Supabase PostgreSQL

## Flujo
1. Selecciona o crea un cliente
2. Define el contexto (problema, budget, timeline)
3. IA genera la propuesta en streaming
4. Edita con TipTap y exporta a PDF/DOCX
