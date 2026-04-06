# Frontend Redesign — Smart Proposal Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PandaDoc-inspired enterprise frontend — design system, public landing page (8 sections), redesigned wizard (two-column layout), and all app screens with real UI (dashboard, proposals, clients, analytics).

**Architecture:** Four phases. Phase 1 (foundation) must complete first: shadcn/ui + design tokens + dark sidebar shell. Phases 2 (landing) and 3 (wizard + app screens) run in parallel after Phase 1. Phase 4 is TypeScript verification. All phases share the same Tailwind v4 CSS token palette.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, shadcn/ui (Radix), Framer Motion, Recharts, TanStack Table v8, Clerk, Vercel AI SDK 4, Zod v4, Lucide React, Geist Sans

---

## Phase 1 — Foundation (Design System + Layout Shell)

### Task 1: Initialize shadcn/ui

**Files:**
- Create: `apps/web/components.json`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Run shadcn init from the web directory**

```bash
cd apps/web
pnpm dlx shadcn@latest init --defaults --force
```

Expected: creates `components.json`, may modify `globals.css`. If it asks questions interactively, answer: TypeScript=Yes, Style=Default, Base color=Slate, CSS variables=Yes.

- [ ] **Step 2: Verify components.json was created**

```bash
cat apps/web/components.json
```

Expected output (adjust if different, but aliases must match):
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 3: Install all required shadcn components**

```bash
cd apps/web
pnpm dlx shadcn@latest add button input textarea badge card dialog \
  dropdown-menu tooltip command separator skeleton progress tabs \
  avatar sonner accordion sheet --overwrite
```

Expected: creates files in `apps/web/components/ui/` for each component. Takes ~30 seconds.

- [ ] **Step 4: Verify UI components exist**

```bash
ls apps/web/components/ui/
```

Expected: `button.tsx`, `input.tsx`, `textarea.tsx`, `badge.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `command.tsx`, `separator.tsx`, `skeleton.tsx`, `progress.tsx`, `tabs.tsx`, `avatar.tsx`, `sonner.tsx`, `accordion.tsx`, `sheet.tsx` (and possibly more).

- [ ] **Step 5: Commit**

```bash
cd apps/web && git add components.json components/ui/ && cd ../..
git add -A
git commit -m "feat: install shadcn/ui components"
```

---

### Task 2: Design Tokens — globals.css

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Replace globals.css with the complete design token file**

Write this as the complete content of `apps/web/app/globals.css`:

```css
@import "tailwindcss";

/* ── Tailwind v4 theme tokens ─────────────────────────────────── */
@theme {
  /* Brand — green */
  --color-brand:          #1D9E75;
  --color-brand-dark:     #158a63;
  --color-brand-light:    #e6f7f2;

  /* Info — blue */
  --color-info:           #2563EB;
  --color-info-light:     #EFF6FF;

  /* Sidebar */
  --color-sidebar:        #0F172A;
  --color-sidebar-text:   #94A3B8;
  --color-sidebar-active: #F8FAFC;
  --color-sidebar-hover:  #1E293B;

  /* Surfaces */
  --color-surface:        #FFFFFF;
  --color-background:     #F8FAFC;
  --color-border:         #E2E8F0;

  /* Text */
  --color-text-primary:   #0F172A;
  --color-text-secondary: #64748B;

  /* Typography */
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/* ── shadcn/ui CSS variables (HSL-free, direct hex via oklch) ─── */
@layer base {
  :root {
    --background: 248 250 252;
    --foreground: 15 23 42;
    --card: 255 255 255;
    --card-foreground: 15 23 42;
    --popover: 255 255 255;
    --popover-foreground: 15 23 42;
    --primary: 29 158 117;
    --primary-foreground: 255 255 255;
    --secondary: 241 245 249;
    --secondary-foreground: 15 23 42;
    --muted: 241 245 249;
    --muted-foreground: 100 116 139;
    --accent: 230 247 242;
    --accent-foreground: 21 138 99;
    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;
    --border: 226 232 240;
    --input: 226 232 240;
    --ring: 29 158 117;
    --radius: 0.75rem;
  }
}

/* ── Base styles ──────────────────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  background-color: #F8FAFC;
  color: #0F172A;
  font-family: var(--font-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Scrollbar styling ────────────────────────────────────────── */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors), or only pre-existing errors unrelated to CSS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat: add design tokens to globals.css"
```

---

### Task 3: Sidebar Component (Dark, Collapsible)

**Files:**
- Create: `apps/web/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create the layout directory and Sidebar component**

Create `apps/web/components/layout/Sidebar.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, useOrganization } from '@clerk/nextjs'
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  ChevronLeft,
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/proposals', label: 'Propuestas', icon: FileText },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/analytics', label: 'Analítica', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const { organization } = useOrganization()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('spg-sidebar-collapsed')
    if (stored !== null) setCollapsed(JSON.parse(stored))
  }, [])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('spg-sidebar-collapsed', JSON.stringify(next))
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-[#0F172A] border-r border-[#1E293B] transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[#1E293B] flex-shrink-0">
        {collapsed ? (
          <Zap className="h-6 w-6 text-[#1D9E75] mx-auto" />
        ) : (
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#1D9E75]" />
            <span className="font-bold text-white text-base tracking-tight">
              Smart<span className="text-[#1D9E75]">SPG</span>
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[#1E293B] text-white border-l-[3px] border-[#1D9E75] pl-[9px]'
                  : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC] border-l-[3px] border-transparent pl-[9px]',
                collapsed && 'justify-center pl-0 border-l-0',
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  active ? 'text-[#1D9E75]' : 'text-[#94A3B8]',
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-[#1E293B] space-y-3 flex-shrink-0">
        {!collapsed && organization && (
          <p className="text-xs text-[#94A3B8] px-2 truncate font-medium">
            {organization.name}
          </p>
        )}

        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-2 px-1')}>
          <UserButton afterSignOutUrl="/" />
          {!collapsed && (
            <Link
              href="/settings"
              className="ml-auto text-[#94A3B8] hover:text-[#F8FAFC] transition-colors p-1 rounded"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded-lg transition-colors"
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')}
          />
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "Sidebar"
```

Expected: no output (no errors in Sidebar.tsx).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/layout/
git commit -m "feat: add dark collapsible Sidebar component"
```

---

### Task 4: Dashboard Layout + Marketing Route Group

**Files:**
- Modify: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/app/(marketing)/layout.tsx`
- Modify: `apps/web/app/page.tsx` (replace redirect with landing redirect)

- [ ] **Step 1: Update dashboard layout to use new Sidebar**

Replace `apps/web/app/(dashboard)/layout.tsx` with:

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')
  if (!orgId) redirect('/select-org')

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create marketing layout**

Create `apps/web/app/(marketing)/layout.tsx`:

```tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
```

- [ ] **Step 3: Update root page.tsx to redirect authenticated users, show landing for guests**

Replace `apps/web/app/page.tsx` with:

```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/LandingPage'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')
  return <LandingPage />
}
```

Note: `LandingPage` will be created in Task 12. For now this will have a type error — fix it in Task 12.

- [ ] **Step 4: Verify typecheck (only new errors for missing LandingPage are expected)**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v "LandingPage"
```

Expected: no output (errors only for the missing LandingPage component, which will be fixed in Task 12).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(dashboard\)/layout.tsx apps/web/app/\(marketing\)/ apps/web/app/page.tsx
git commit -m "feat: update dashboard layout with new Sidebar, add marketing route group"
```

---

## Phase 2 — Landing Page

### Task 5: Navbar Component

**Files:**
- Create: `apps/web/components/landing/Navbar.tsx`

- [ ] **Step 1: Create Navbar**

Create `apps/web/components/landing/Navbar.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '#features', label: 'Características' },
  { href: '#pricing', label: 'Precios' },
  { href: '#integrations', label: 'Integraciones' },
  { href: '#faq', label: 'FAQ' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#1D9E75]" />
          <span className="font-bold text-gray-900 text-base">
            Smart<span className="text-[#1D9E75]">SPG</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#158a63] transition-colors"
          >
            Empezar gratis
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm text-gray-600 py-1"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/sign-in" className="text-sm text-gray-600 py-2">
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium bg-[#1D9E75] text-white px-4 py-2 rounded-lg text-center"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/landing/
git commit -m "feat: add landing Navbar component"
```

---

### Task 6: Hero Section

**Files:**
- Create: `apps/web/components/landing/Hero.tsx`

- [ ] **Step 1: Create Hero component**

Create `apps/web/components/landing/Hero.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

const STREAMING_SECTIONS = [
  'Resumen ejecutivo',
  'Problema',
  'Solución',
  'Alcance',
  'Inversión',
]

const TRUST_ITEMS = [
  'Sin tarjeta de crédito',
  '3 propuestas gratis',
  'Cancela cuando quieras',
]

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#e6f7f2]/30 to-white" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231D9E75' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#e6f7f2] text-[#1D9E75] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Claude AI
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Propuestas ganadoras,{' '}
              <span className="text-[#1D9E75]">generadas en minutos</span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
              Analiza tu cliente, genera con Claude AI y exporta en PDF o Word.
              Para equipos de ventas en LATAM que quieren cerrar más negocios.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 bg-[#1D9E75] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#158a63] transition-colors text-sm"
              >
                Empezar gratis — es gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Ver cómo funciona
              </a>
            </div>

            <div className="flex flex-wrap gap-4">
              {TRUST_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Animated mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="bg-[#0F172A] rounded-2xl p-6 shadow-2xl border border-[#1E293B]">
              {/* Mockup header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1E293B]">
                <div className="h-9 w-9 rounded-full bg-[#1D9E75] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Generando propuesta...</p>
                  <p className="text-[#94A3B8] text-xs">TechCorp SA · Consultoría</p>
                </div>
                <div className="ml-auto">
                  <div className="h-2 w-24 bg-[#1E293B] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#1D9E75] rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: '71%' }}
                      transition={{ duration: 2, delay: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Streaming sections */}
              <div className="space-y-3">
                {STREAMING_SECTIONS.map((section, i) => {
                  const done = i < 3
                  return (
                    <motion.div
                      key={section}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`h-5 w-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                          done
                            ? 'bg-[#1D9E75]'
                            : i === 3
                              ? 'border-2 border-[#1D9E75] animate-pulse'
                              : 'border-2 border-[#1E293B]'
                        }`}
                      >
                        {done && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-medium ${done ? 'text-[#94A3B8]' : i === 3 ? 'text-white' : 'text-[#475569]'}`}>
                          {section}
                        </p>
                        {done && (
                          <div className="h-1.5 w-full bg-[#1E293B] rounded mt-1">
                            <div
                              className="h-full bg-[#1E293B] rounded"
                              style={{ width: `${70 + i * 10}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/landing/Hero.tsx
git commit -m "feat: add landing Hero section with animated mockup"
```

---

### Task 7: SocialProof + HowItWorks Sections

**Files:**
- Create: `apps/web/components/landing/SocialProof.tsx`
- Create: `apps/web/components/landing/HowItWorks.tsx`

- [ ] **Step 1: Create SocialProof component**

Create `apps/web/components/landing/SocialProof.tsx`:

```tsx
const INDUSTRIES = [
  'Tecnología', 'Retail', 'Salud', 'Educación',
  'Finanzas', 'Logística', 'Manufactura', 'Consultoría',
]

export function SocialProof() {
  return (
    <section className="py-12 bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-center text-sm text-gray-400 mb-8 font-medium uppercase tracking-widest">
          Utilizado por equipos de ventas en toda LATAM
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {INDUSTRIES.map((industry) => (
            <div
              key={industry}
              className="px-5 py-2.5 bg-white border border-gray-100 rounded-full text-sm text-gray-400 font-medium shadow-sm"
            >
              {industry}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create HowItWorks component**

Create `apps/web/components/landing/HowItWorks.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Users, Sparkles, Download, ArrowRight } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: Users,
    title: 'Elige el cliente',
    description: 'Selecciona un cliente existente o crea uno nuevo en segundos. El contexto de tu cliente personaliza cada palabra de la propuesta.',
    color: '#2563EB',
    bgColor: '#EFF6FF',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'Claude genera',
    description: 'Describe el problema, elige el template y presiona generar. Claude Sonnet redacta las 7 secciones en tiempo real, ante tus ojos.',
    color: '#1D9E75',
    bgColor: '#e6f7f2',
  },
  {
    number: '03',
    icon: Download,
    title: 'Exporta y cierra',
    description: 'Descarga en PDF profesional o Word editable. Envía por email directamente desde la plataforma. Cierra más y más rápido.',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
  },
]

export function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="how-it-works" className="py-20" ref={ref}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Cómo funciona</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            De cero a propuesta lista en menos de 3 minutos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector lines */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-[#EFF6FF] via-[#e6f7f2] to-[#F5F3FF]" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15 }}
              className="relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: step.bgColor }}
                >
                  <step.icon className="h-5 w-5" style={{ color: step.color }} />
                </div>
                <span
                  className="text-4xl font-black opacity-10"
                  style={{ color: step.color }}
                >
                  {step.number}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>

              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-3 top-12 h-5 w-5 text-gray-300 z-10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/landing/SocialProof.tsx apps/web/components/landing/HowItWorks.tsx
git commit -m "feat: add SocialProof and HowItWorks landing sections"
```

---

### Task 8: FeaturesGrid + PricingTable

**Files:**
- Create: `apps/web/components/landing/FeaturesGrid.tsx`
- Create: `apps/web/components/landing/PricingTable.tsx`

- [ ] **Step 1: Create FeaturesGrid**

Create `apps/web/components/landing/FeaturesGrid.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Zap, Shield, FileDown, Layers, BarChart3, Mail } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Streaming IA',
    description: 'Genera propuestas en tiempo real con Claude Sonnet. Ves cada sección aparecer mientras se escribe.',
  },
  {
    icon: Shield,
    title: 'Multi-tenant seguro',
    description: 'Organizaciones completamente separadas. Tus datos nunca se mezclan con los de otros clientes.',
  },
  {
    icon: FileDown,
    title: 'Export PDF y Word',
    description: 'Descarga con un clic en formato profesional. PDF con diseño premium o Word para edición posterior.',
  },
  {
    icon: Layers,
    title: 'Templates por industria',
    description: 'Software, consultoría, marketing, cloud y más. Cada template está optimizado para su sector.',
  },
  {
    icon: BarChart3,
    title: 'Analytics de propuestas',
    description: 'Mide tu tasa de cierre, el valor promedio por propuesta y los clientes más rentables.',
  },
  {
    icon: Mail,
    title: 'Integración con email',
    description: 'Envía la propuesta directamente desde la plataforma. El cliente recibe un PDF profesional.',
  },
]

export function FeaturesGrid() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="features" className="py-20 bg-gray-50" ref={ref}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Todo lo que necesitas para cerrar</h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Construido para equipos de ventas que no tienen tiempo que perder.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-xl bg-[#e6f7f2] flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-[#1D9E75]" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create PricingTable**

Create `apps/web/components/landing/PricingTable.tsx`:

```tsx
import Link from 'next/link'
import { Check, Minus } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mes',
    description: 'Para probar la plataforma',
    cta: 'Empezar gratis',
    ctaHref: '/sign-up',
    popular: false,
    features: [
      { label: '3 propuestas / mes', included: true },
      { label: '1 usuario', included: true },
      { label: 'Templates básicos', included: true },
      { label: 'Export PDF', included: true },
      { label: 'Analytics', included: false },
      { label: 'Export Word', included: false },
      { label: 'Soporte email', included: true },
      { label: 'API access', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mes',
    description: 'Para equipos de ventas activos',
    cta: 'Empezar gratis',
    ctaHref: '/sign-up',
    popular: true,
    features: [
      { label: 'Propuestas ilimitadas', included: true },
      { label: 'Hasta 5 usuarios', included: true },
      { label: 'Todos los templates + IA', included: true },
      { label: 'Export PDF y Word', included: true },
      { label: 'Analytics completo', included: true },
      { label: 'Envío por email', included: true },
      { label: 'Soporte prioritario', included: true },
      { label: 'API access', included: false },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Consultar',
    period: '',
    description: 'Para grandes organizaciones',
    cta: 'Contactar ventas',
    ctaHref: 'mailto:hola@smartspg.io',
    popular: false,
    features: [
      { label: 'Propuestas ilimitadas', included: true },
      { label: 'Usuarios ilimitados', included: true },
      { label: 'Templates custom', included: true },
      { label: 'Export PDF y Word', included: true },
      { label: 'Analytics avanzado', included: true },
      { label: 'Envío por email', included: true },
      { label: 'SLA + soporte dedicado', included: true },
      { label: 'API access', included: true },
    ],
  },
]

export function PricingTable() {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Precios simples y transparentes</h2>
          <p className="text-gray-500 text-lg">Sin sorpresas. Cancela cuando quieras.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-7 ${
                plan.popular
                  ? 'border-2 border-[#1D9E75] shadow-xl shadow-[#1D9E75]/10'
                  : 'border border-gray-100 shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-[#1D9E75] text-white text-xs font-bold px-3 py-1 rounded-full">
                    Más popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-base font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500">{plan.description}</p>
              </div>

              <Link
                href={plan.ctaHref}
                className={`block text-center text-sm font-semibold py-2.5 px-4 rounded-xl mb-6 transition-colors ${
                  plan.popular
                    ? 'bg-[#1D9E75] text-white hover:bg-[#158a63]'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2.5">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-200 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-300'}`}
                    >
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/landing/FeaturesGrid.tsx apps/web/components/landing/PricingTable.tsx
git commit -m "feat: add FeaturesGrid and PricingTable landing sections"
```

---

### Task 9: Integrations + FAQ + CTAFinal + Footer

**Files:**
- Create: `apps/web/components/landing/Integrations.tsx`
- Create: `apps/web/components/landing/FAQ.tsx`
- Create: `apps/web/components/landing/CTAFinal.tsx`
- Create: `apps/web/components/landing/Footer.tsx`

- [ ] **Step 1: Create Integrations**

Create `apps/web/components/landing/Integrations.tsx`:

```tsx
const INTEGRATIONS = [
  { name: 'Anthropic Claude', letter: 'A' },
  { name: 'Clerk Auth', letter: 'C' },
  { name: 'Stripe', letter: 'S' },
  { name: 'Supabase', letter: 'SB' },
  { name: 'Upstash', letter: 'U' },
  { name: 'Resend', letter: 'R' },
  { name: 'DocuForge', letter: 'D' },
]

export function Integrations() {
  return (
    <section id="integrations" className="py-20 bg-[#0F172A]">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">
          Construido con las mejores herramientas
        </h2>
        <p className="text-[#94A3B8] text-lg mb-12">
          Infraestructura enterprise, lista para producción desde el día uno.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-3 bg-[#1E293B] border border-[#334155] rounded-xl px-5 py-3"
            >
              <div className="h-7 w-7 rounded-md bg-[#334155] flex items-center justify-center text-xs font-bold text-white">
                {integration.letter}
              </div>
              <span className="text-sm text-[#94A3B8] font-medium">{integration.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create FAQ**

Create `apps/web/components/landing/FAQ.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  {
    q: '¿Qué pasa cuando se acaban mis 3 propuestas del plan Free?',
    a: 'Tus propuestas existentes quedan guardadas y puedes seguir viéndolas. Para generar nuevas, puedes hacer upgrade al plan Pro en cualquier momento desde tu configuración.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí, sin penalizaciones ni preguntas. Puedes cancelar desde tu panel de configuración y seguirás teniendo acceso hasta el final del período pagado.',
  },
  {
    q: '¿Mis datos están seguros? ¿Cómo funciona el multi-tenant?',
    a: 'Cada organización está completamente aislada a nivel de base de datos. Usamos Supabase con Row-Level Security. Ningún dato de tu empresa es visible para otros usuarios.',
  },
  {
    q: '¿En qué idiomas genera propuestas?',
    a: 'Principalmente en español (optimizado para LATAM y España), pero puedes pedir propuestas en inglés, portugués u otros idiomas simplemente describiendo el problema en ese idioma.',
  },
  {
    q: '¿Puedo personalizar el template con el logo de mi empresa?',
    a: 'En el plan Pro puedes subir tu logo y colores de marca. El PDF exportado incluirá tu identidad corporativa. En Enterprise, diseñamos templates completamente personalizados.',
  },
  {
    q: '¿Hay soporte en español?',
    a: 'Sí, todo nuestro soporte es en español. Puedes contactarnos por email o por el chat de la plataforma. El plan Pro tiene respuesta prioritaria en menos de 4 horas hábiles.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Preguntas frecuentes</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-xl overflow-hidden bg-white"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-400 flex-shrink-0 transition-transform',
                    open === i && 'rotate-180',
                  )}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create CTAFinal**

Create `apps/web/components/landing/CTAFinal.tsx`:

```tsx
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTAFinal() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto bg-gradient-to-br from-[#1D9E75] to-[#158a63] rounded-3xl p-12 text-center shadow-2xl shadow-[#1D9E75]/20">
        <h2 className="text-3xl font-bold text-white mb-4">
          ¿Listo para cerrar más ventas?
        </h2>
        <p className="text-[#e6f7f2] text-lg mb-8 max-w-xl mx-auto">
          Únete a los equipos de ventas que ya usan SmartSPG para ganar más propuestas en menos tiempo.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 bg-white text-[#1D9E75] font-bold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          Empezar gratis hoy
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-[#e6f7f2]/70 text-xs mt-4">
          Sin tarjeta de crédito · 3 propuestas gratis · Cancela cuando quieras
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Create Footer**

Create `apps/web/components/landing/Footer.tsx`:

```tsx
import Link from 'next/link'
import { Zap } from 'lucide-react'

const LINKS = {
  Producto: [
    { label: 'Características', href: '#features' },
    { label: 'Precios', href: '#pricing' },
    { label: 'Integraciones', href: '#integrations' },
    { label: 'Changelog', href: '#' },
  ],
  Empresa: [
    { label: 'Sobre nosotros', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contacto', href: 'mailto:hola@smartspg.io' },
  ],
  Legal: [
    { label: 'Términos de uso', href: '#' },
    { label: 'Privacidad', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 py-14">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-[#1D9E75]" />
              <span className="font-bold text-gray-900">
                Smart<span className="text-[#1D9E75]">SPG</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Propuestas comerciales con IA para equipos de ventas en LATAM.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} SmartSPG. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-400">
            Hecho con ❤️ para equipos de ventas en LATAM
          </p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/landing/
git commit -m "feat: add Integrations, FAQ, CTAFinal, Footer landing sections"
```

---

### Task 10: Assemble Landing Page

**Files:**
- Create: `apps/web/components/landing/LandingPage.tsx`

- [ ] **Step 1: Create LandingPage assembly component**

Create `apps/web/components/landing/LandingPage.tsx`:

```tsx
import { Navbar } from './Navbar'
import { Hero } from './Hero'
import { SocialProof } from './SocialProof'
import { HowItWorks } from './HowItWorks'
import { FeaturesGrid } from './FeaturesGrid'
import { PricingTable } from './PricingTable'
import { Integrations } from './Integrations'
import { FAQ } from './FAQ'
import { CTAFinal } from './CTAFinal'
import { Footer } from './Footer'

export function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <FeaturesGrid />
      <PricingTable />
      <Integrations />
      <FAQ />
      <CTAFinal />
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (the `LandingPage` import in `app/page.tsx` from Task 4 should now resolve).

- [ ] **Step 3: Verify landing renders in dev**

```bash
pnpm --filter web dev
```

Open `http://localhost:3000` in browser. Expected: landing page renders with Navbar, Hero (with animated mockup), all sections, and Footer. No console errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/landing/LandingPage.tsx
git commit -m "feat: assemble landing page — all 8 sections"
```

---

## Phase 3 — Wizard Redesign + App Screens

### Task 11: WizardProgress + ProposalWizard Two-Column Layout

**Files:**
- Create: `apps/web/components/wizard/WizardProgress.tsx`
- Modify: `apps/web/components/wizard/ProposalWizard.tsx`

- [ ] **Step 1: Create WizardProgress (left panel)**

Create `apps/web/components/wizard/WizardProgress.tsx`:

```tsx
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WizardStep {
  number: number
  label: string
  description: string
}

const STEPS: WizardStep[] = [
  { number: 1, label: 'Cliente', description: 'Selecciona o crea un cliente' },
  { number: 2, label: 'Contexto', description: 'Describe el problema y configuración' },
  { number: 3, label: 'Generación', description: 'Claude redacta tu propuesta' },
  { number: 4, label: 'Revisión', description: 'Revisa y exporta' },
]

interface WizardProgressProps {
  currentStep: number
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
  return (
    <aside className="w-64 flex-shrink-0">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
          Progreso
        </h2>

        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const done = currentStep > step.number
            const active = currentStep === step.number
            const pending = currentStep < step.number

            return (
              <div key={step.number} className="flex gap-4">
                {/* Left: circle + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                      done && 'bg-[#1D9E75]',
                      active && 'bg-[#1D9E75] ring-4 ring-[#e6f7f2]',
                      pending && 'bg-white border-2 border-gray-200',
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <span
                        className={cn(
                          'text-xs font-bold',
                          active ? 'text-white' : 'text-gray-400',
                        )}
                      >
                        {step.number}
                      </span>
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'w-0.5 flex-1 my-1 min-h-[28px] transition-colors',
                        done ? 'bg-[#1D9E75]' : 'bg-gray-100',
                      )}
                    />
                  )}
                </div>

                {/* Right: label + description */}
                <div className={cn('pb-6', i === STEPS.length - 1 && 'pb-0')}>
                  <p
                    className={cn(
                      'text-sm font-semibold leading-tight',
                      active || done ? 'text-gray-900' : 'text-gray-400',
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Rewrite ProposalWizard with two-column layout**

Replace `apps/web/components/wizard/ProposalWizard.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { WizardProgress } from './WizardProgress'
import { Step1Client, type ClientData } from './Step1Client'
import { Step2Context, type ContextData } from './Step2Context'
import { Step3Generate, type ProposalSections } from './Step3Generate'
import { Step4Review } from './Step4Review'

const STEP_TITLES = [
  { title: 'Selecciona un cliente', subtitle: 'Elige un cliente existente o crea uno nuevo.' },
  { title: 'Contexto de la propuesta', subtitle: 'Describe el desafío y configura las opciones.' },
  { title: 'Generando con IA', subtitle: 'Claude está redactando tu propuesta personalizada.' },
  { title: 'Revisa y exporta', subtitle: 'Tu propuesta está lista. Revísala y descárgala.' },
]

export function ProposalWizard() {
  const [step, setStep] = useState(1)
  const [client, setClient] = useState<ClientData | null>(null)
  const [context, setContext] = useState<ContextData | null>(null)
  const [sections, setSections] = useState<ProposalSections | null>(null)

  const { title, subtitle } = STEP_TITLES[step - 1]

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/proposals"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Propuestas
        </Link>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step ? 'bg-[#1D9E75] w-8' : 'bg-gray-200 w-4'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Left: progress panel */}
        <WizardProgress currentStep={step} />

        {/* Right: step content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            </div>

            {step === 1 && (
              <Step1Client
                onNext={(c) => {
                  setClient(c)
                  setStep(2)
                }}
              />
            )}

            {step === 2 && client && (
              <Step2Context
                client={client}
                onNext={(ctx) => {
                  setContext(ctx)
                  setStep(3)
                }}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && client && context && (
              <Step3Generate
                client={client}
                context={context}
                onNext={(s) => {
                  setSections(s)
                  setStep(4)
                }}
                onBack={() => setStep(2)}
              />
            )}

            {step === 4 && client && sections && (
              <Step4Review
                client={client}
                sections={sections}
                onBack={() => setStep(3)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "wizard\|progress"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/wizard/WizardProgress.tsx apps/web/components/wizard/ProposalWizard.tsx
git commit -m "feat: wizard two-column layout with WizardProgress panel"
```

---

### Task 12: Step3Generate — Dark Panel + Framer Motion

**Files:**
- Modify: `apps/web/components/wizard/Step3Generate.tsx`

- [ ] **Step 1: Rewrite Step3Generate with dark panel and animations**

Replace `apps/web/components/wizard/Step3Generate.tsx` with:

```tsx
'use client'

import { useEffect } from 'react'
import { experimental_useObject as useObject } from 'ai/react'
import { z } from 'zod/v4'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { ClientData } from './Step1Client'
import type { ContextData } from './Step2Context'

export interface ProposalSections {
  resumenEjecutivo: string
  problema: string
  solucion: string
  alcance: string
  timeline: string
  inversion: string
  proximosPasos: string
}

const ProposalSectionSchema = z.object({
  resumenEjecutivo: z.string(),
  problema: z.string(),
  solucion: z.string(),
  alcance: z.string(),
  timeline: z.string(),
  inversion: z.string(),
  proximosPasos: z.string(),
})

const SECTION_LABELS: Record<keyof ProposalSections, string> = {
  resumenEjecutivo: 'Resumen ejecutivo',
  problema: 'Problema',
  solucion: 'Solución',
  alcance: 'Alcance del proyecto',
  timeline: 'Cronograma',
  inversion: 'Inversión',
  proximosPasos: 'Próximos pasos',
}

const SECTION_ORDER: (keyof ProposalSections)[] = [
  'resumenEjecutivo', 'problema', 'solucion', 'alcance',
  'timeline', 'inversion', 'proximosPasos',
]

interface Step3GenerateProps {
  client: ClientData
  context: ContextData
  onNext: (sections: ProposalSections) => void
  onBack: () => void
}

export function Step3Generate({ client, context, onNext, onBack }: Step3GenerateProps) {
  const { object, submit, isLoading, error } = useObject<ProposalSections>({
    api: '/api/proposals/stream',
    schema: ProposalSectionSchema,
  })

  const partial = object as Partial<ProposalSections> | undefined

  useEffect(() => {
    submit({
      clientId: client.id,
      clientName: client.name,
      company: client.company,
      industry: client.industry ?? '',
      problema: context.problema,
      budget: context.budget,
      timeline: context.timeline,
      tono: context.tono,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completedCount = SECTION_ORDER.filter((k) => !!partial?.[k]).length
  const progressPct = Math.round((completedCount / SECTION_ORDER.length) * 100)
  const isComplete = !isLoading && completedCount === SECTION_ORDER.length

  function getStatus(key: keyof ProposalSections): 'done' | 'streaming' | 'pending' {
    if (partial?.[key]) return 'done'
    if (isLoading) {
      const idx = SECTION_ORDER.indexOf(key)
      const prevKey = SECTION_ORDER[idx - 1]
      if (idx === 0 || (prevKey && partial?.[prevKey])) return 'streaming'
    }
    return 'pending'
  }

  return (
    <div className="space-y-6">
      {/* Dark panel */}
      <div className="bg-[#0F172A] rounded-2xl p-6 border border-[#1E293B]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-full bg-[#1D9E75]/20 flex items-center justify-center">
            <Sparkles
              className={`h-5 w-5 text-[#1D9E75] ${isLoading ? 'animate-pulse' : ''}`}
            />
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">
              {isComplete ? '¡Propuesta generada!' : isLoading ? 'Claude está generando...' : error ? 'Error al generar' : 'Listo para revisar'}
            </p>
            <p className="text-[#94A3B8] text-xs">{client.company} · {context.template}</p>
          </div>
          <div className="text-right">
            <span className="text-[#1D9E75] text-sm font-bold">{progressPct}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPct} className="h-1.5 mb-5 bg-[#1E293B]" />

        {/* Sections */}
        <div className="space-y-2">
          {SECTION_ORDER.map((key, i) => {
            const status = getStatus(key)
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#1E293B]/50"
              >
                {/* Status icon */}
                <div className="flex-shrink-0 h-5 w-5 flex items-center justify-center">
                  {status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-[#1D9E75]" />
                  ) : status === 'streaming' ? (
                    <Loader2 className="h-4 w-4 text-[#1D9E75] animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-[#334155]" />
                  )}
                </div>

                {/* Label + preview */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium ${
                      status === 'done'
                        ? 'text-[#94A3B8]'
                        : status === 'streaming'
                          ? 'text-white'
                          : 'text-[#475569]'
                    }`}
                  >
                    {SECTION_LABELS[key]}
                  </p>
                  {status === 'done' && partial?.[key] && (
                    <p className="text-xs text-[#475569] mt-0.5 truncate">
                      {partial[key]?.substring(0, 70)}...
                    </p>
                  )}
                  {status === 'streaming' && (
                    <div className="flex gap-1 mt-1">
                      {[40, 70, 55, 85].map((w, i) => (
                        <motion.div
                          key={i}
                          className="h-1 bg-[#1D9E75]/40 rounded"
                          style={{ width: `${w}%` }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400 text-center">{error.message}</p>
        )}

        <p className="text-center text-xs text-[#475569] mt-4">
          Esta propuesta usa Claude Sonnet · estimado ~30 segundos
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isLoading} size="lg">
          Atrás
        </Button>
        <Button
          onClick={() => isComplete && onNext(partial as ProposalSections)}
          disabled={!isComplete}
          size="lg"
          className="flex-1 bg-[#1D9E75] hover:bg-[#158a63] text-white"
        >
          Revisar propuesta →
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "step3\|generate"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/wizard/Step3Generate.tsx
git commit -m "feat: Step3Generate dark panel with Framer Motion streaming animations"
```

---

### Task 13: Step4Review — Document Preview

**Files:**
- Modify: `apps/web/components/wizard/Step4Review.tsx`

- [ ] **Step 1: Rewrite Step4Review as premium document preview**

Replace `apps/web/components/wizard/Step4Review.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { FileText, Download, Mail, Share2, Plus, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { ClientData } from './Step1Client'
import type { ProposalSections } from './Step3Generate'

const SECTION_LABELS: Record<keyof ProposalSections, string> = {
  resumenEjecutivo: 'Resumen Ejecutivo',
  problema: 'El Problema',
  solucion: 'Nuestra Solución',
  alcance: 'Alcance del Proyecto',
  timeline: 'Cronograma',
  inversion: 'Inversión',
  proximosPasos: 'Próximos Pasos',
}

const SECTION_ORDER: (keyof ProposalSections)[] = [
  'resumenEjecutivo', 'problema', 'solucion', 'alcance',
  'timeline', 'inversion', 'proximosPasos',
]

interface Step4ReviewProps {
  client: ClientData
  sections: ProposalSections
  onBack: () => void
}

export function Step4Review({ client, sections, onBack }: Step4ReviewProps) {
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)

  async function handleExport(format: 'pdf' | 'docx') {
    setExporting(format)
    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections, client, format }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `propuesta-${client.company.toLowerCase().replace(/\s+/g, '-')}.${format}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(null)
    }
  }

  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex gap-6 items-start">
      {/* Document preview */}
      <div className="flex-1 min-w-0">
        {/* Document paper */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          {/* Document header */}
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-10 py-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-[#94A3B8]" />
                  <span className="text-[#94A3B8] text-sm">{client.company}</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Propuesta Comercial</h1>
                <p className="text-[#94A3B8] text-sm">{today}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#1D9E75] flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {client.company.charAt(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Document body */}
          <div className="px-10 py-8 space-y-8 max-h-[520px] overflow-y-auto">
            {SECTION_ORDER.map((key, i) => (
              <div key={key}>
                {i > 0 && <Separator className="mb-8" />}
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1D9E75] bg-[#e6f7f2] px-2 py-0.5 rounded">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {SECTION_LABELS[key]}
                </h2>
                <p className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {sections[key]}
                </p>
              </div>
            ))}

            {/* Footer */}
            <div className="pt-4 pb-2 text-center">
              <Badge variant="secondary" className="text-xs text-gray-400">
                Generado con Claude AI · SmartSPG
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Actions sidebar */}
      <div className="w-52 flex-shrink-0 sticky top-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Exportar
          </p>

          <Button
            className="w-full justify-start gap-2 bg-[#1D9E75] hover:bg-[#158a63] text-white"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
          >
            <FileText className="h-4 w-4" />
            {exporting === 'pdf' ? 'Generando...' : 'PDF'}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => handleExport('docx')}
            disabled={!!exporting}
          >
            <Download className="h-4 w-4" />
            {exporting === 'docx' ? 'Generando...' : 'Word (.docx)'}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
            disabled
          >
            <Mail className="h-4 w-4" />
            Enviar por email
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            size="sm"
            disabled
          >
            <Share2 className="h-4 w-4" />
            Compartir link
          </Button>

          <Separator />

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onBack}
          >
            <Plus className="h-4 w-4" />
            Nueva propuesta
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "step4\|review"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/wizard/Step4Review.tsx
git commit -m "feat: Step4Review document preview with export sidebar"
```

---

### Task 14: Dashboard Page — Stat Cards + Charts

**Files:**
- Create: `apps/web/components/dashboard/StatCard.tsx`
- Create: `apps/web/components/dashboard/ProposalsChart.tsx`
- Modify: `apps/web/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create StatCard component**

Create `apps/web/components/dashboard/StatCard.tsx`:

```tsx
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  iconColor?: string
  iconBg?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconColor = '#2563EB',
  iconBg = '#EFF6FF',
}: StatCardProps) {
  const positive = trend !== undefined && trend >= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            }`}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create ProposalsChart component**

Create `apps/web/components/dashboard/ProposalsChart.tsx`:

```tsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const BAR_DATA = [
  { month: 'Nov', enviadas: 8, aceptadas: 5 },
  { month: 'Dic', enviadas: 12, aceptadas: 9 },
  { month: 'Ene', enviadas: 7, aceptadas: 4 },
  { month: 'Feb', enviadas: 15, aceptadas: 11 },
  { month: 'Mar', enviadas: 10, aceptadas: 7 },
  { month: 'Abr', enviadas: 6, aceptadas: 5 },
]

const DONUT_DATA = [
  { name: 'Aceptadas', value: 41, color: '#1D9E75' },
  { name: 'En revisión', value: 27, color: '#2563EB' },
  { name: 'Borrador', value: 20, color: '#94A3B8' },
  { name: 'Rechazadas', value: 12, color: '#FCA5A5' },
]

export function ProposalsBarChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Propuestas por mes</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={BAR_DATA} barSize={10}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
          />
          <Bar dataKey="enviadas" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Enviadas" />
          <Bar dataKey="aceptadas" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Aceptadas" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ClosingRateDonut() {
  const rate = 67

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Tasa de cierre</h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={DONUT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={56}
                dataKey="value"
                strokeWidth={0}
              >
                {DONUT_DATA.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-black text-gray-900">{rate}%</span>
          </div>
        </div>
        <div className="space-y-2">
          {DONUT_DATA.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-500">{item.name}</span>
              <span className="text-xs font-semibold text-gray-900 ml-auto">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update dashboard page**

Replace `apps/web/app/(dashboard)/dashboard/page.tsx` with:

```tsx
import Link from 'next/link'
import { auth, currentUser } from '@clerk/nextjs/server'
import { Plus, FileText, CheckCircle2, Clock, DollarSign } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProposalsBarChart, ClosingRateDonut } from '@/components/dashboard/ProposalsChart'

const RECENT_PROPOSALS = [
  { id: '1', title: 'Plataforma e-commerce', client: 'TechCorp SA', status: 'accepted', date: 'Hoy', value: '$12,000' },
  { id: '2', title: 'Consultoría digital', client: 'Retail Plus', status: 'sent', date: 'Ayer', value: '$8,500' },
  { id: '3', title: 'Migración cloud', client: 'HealthMed', status: 'draft', date: 'Hace 2 días', value: '$24,000' },
  { id: '4', title: 'App móvil', client: 'EduTech', status: 'rejected', date: 'Hace 3 días', value: '$18,000' },
  { id: '5', title: 'CRM personalizado', client: 'FinCorp', status: 'sent', date: 'Hace 5 días', value: '$31,000' },
]

const STATUS_STYLES: Record<string, string> = {
  accepted: 'bg-green-50 text-green-700',
  sent: 'bg-blue-50 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Aceptada',
  sent: 'Enviada',
  draft: 'Borrador',
  rejected: 'Rechazada',
}

export default async function DashboardPage() {
  const user = await currentUser()
  const firstName = user?.firstName ?? 'equipo'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva propuesta
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Propuestas totales"
          value={48}
          icon={FileText}
          trend={12}
          trendLabel="vs mes anterior"
        />
        <StatCard
          label="Aceptadas"
          value={32}
          icon={CheckCircle2}
          trend={8}
          iconColor="#1D9E75"
          iconBg="#e6f7f2"
        />
        <StatCard
          label="En revisión"
          value={10}
          icon={Clock}
          trend={-3}
          iconColor="#F59E0B"
          iconBg="#FFFBEB"
        />
        <StatCard
          label="Valor total"
          value="$93.5K"
          icon={DollarSign}
          trend={22}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
        />
      </div>

      {/* Middle row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Recent proposals */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Actividad reciente</h3>
            <Link href="/proposals" className="text-xs text-[#1D9E75] hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-1">
            {RECENT_PROPOSALS.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{proposal.title}</p>
                  <p className="text-xs text-gray-400">{proposal.client}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[proposal.status]}`}
                >
                  {STATUS_LABELS[proposal.status]}
                </span>
                <span className="text-xs font-semibold text-gray-700 w-16 text-right">
                  {proposal.value}
                </span>
                <span className="text-xs text-gray-400 w-20 text-right">{proposal.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <ClosingRateDonut />
      </div>

      {/* Bar chart */}
      <ProposalsBarChart />
    </div>
  )
}
```

- [ ] **Step 4: Verify typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "dashboard\|statcard\|chart"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard/ apps/web/app/\(dashboard\)/dashboard/
git commit -m "feat: dashboard page with StatCards, bar chart, donut chart, recent activity"
```

---

### Task 15: Proposals List — TanStack Table

**Files:**
- Modify: `apps/web/app/(dashboard)/proposals/page.tsx`

- [ ] **Step 1: Rewrite proposals page with TanStack Table**

Replace `apps/web/app/(dashboard)/proposals/page.tsx` with:

```tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Plus, Search, MoreHorizontal, Eye, Copy, Archive, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Proposal {
  id: string
  title: string
  client: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  value: string
  date: string
}

const MOCK_PROPOSALS: Proposal[] = [
  { id: '1', title: 'Plataforma e-commerce B2B', client: 'TechCorp SA', status: 'accepted', value: '$12,000', date: '06/04/2026' },
  { id: '2', title: 'Consultoría transformación digital', client: 'Retail Plus', status: 'sent', value: '$8,500', date: '05/04/2026' },
  { id: '3', title: 'Migración cloud AWS', client: 'HealthMed', status: 'draft', value: '$24,000', date: '04/04/2026' },
  { id: '4', title: 'App móvil iOS + Android', client: 'EduTech', status: 'rejected', value: '$18,000', date: '03/04/2026' },
  { id: '5', title: 'CRM personalizado', client: 'FinCorp', status: 'sent', value: '$31,000', date: '02/04/2026' },
  { id: '6', title: 'Sistema de logística', client: 'LogiPro', status: 'accepted', value: '$45,000', date: '01/04/2026' },
  { id: '7', title: 'Rediseño UX/UI', client: 'CreativeCo', status: 'draft', value: '$6,000', date: '31/03/2026' },
]

const STATUS_STYLES: Record<Proposal['status'], string> = {
  accepted: 'bg-green-50 text-green-700',
  sent: 'bg-blue-50 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-500',
}

const STATUS_LABELS: Record<Proposal['status'], string> = {
  accepted: 'Aceptada',
  sent: 'Enviada',
  draft: 'Borrador',
  rejected: 'Rechazada',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borradores' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
]

export default function ProposalsPage() {
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const columns = useMemo<ColumnDef<Proposal>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Propuesta',
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium text-gray-900">{row.original.title}</p>
            <p className="text-xs text-gray-400">{row.original.client}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => (
          <span
            className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full',
              STATUS_STYLES[row.original.status],
            )}
          >
            {STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        accessorKey: 'value',
        header: 'Valor',
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-gray-900">{row.original.value}</span>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Fecha',
        cell: ({ row }) => (
          <span className="text-sm text-gray-400">{row.original.date}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="gap-2 text-sm">
                <Eye className="h-3.5 w-3.5" /> Ver
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm">
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm">
                <Archive className="h-3.5 w-3.5" /> Archivar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm text-red-500">
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  )

  const filteredData = useMemo(() => {
    let data = MOCK_PROPOSALS
    if (statusFilter) data = data.filter((p) => p.status === statusFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      data = data.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q),
      )
    }
    return data
  }, [globalFilter, statusFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propuestas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona todas tus propuestas comerciales.</p>
        </div>
        <Link
          href="/proposals/new"
          className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva propuesta
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Buscar propuestas..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <select
          className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filteredData.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sin propuestas</h3>
          <p className="text-sm text-gray-400 mb-5">
            {globalFilter || statusFilter
              ? 'No hay propuestas con esos filtros.'
              : 'Crea tu primera propuesta con IA en minutos.'}
          </p>
          <Link
            href="/proposals/new"
            className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear propuesta
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-100">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-gray-50 hover:bg-gray-50 transition-colors',
                    i === table.getRowModel().rows.length - 1 && 'border-b-0',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5">
                      {flexRender(cell.column.columnDef.def, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {filteredData.length} propuesta{filteredData.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Fix cell renderer typo**

In the table definition in the file just written, find `cell.column.columnDef.def` and replace with `cell.column.columnDef.cell`. Edit the file:

```
// Find this line:
{flexRender(cell.column.columnDef.def, cell.getContext())}
// Replace with:
{flexRender(cell.column.columnDef.cell, cell.getContext())}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "proposals\|table"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(dashboard\)/proposals/page.tsx
git commit -m "feat: proposals list with TanStack Table, filters, pagination, row actions"
```

---

### Task 16: Clients Page + Analytics Page

**Files:**
- Modify: `apps/web/app/(dashboard)/clients/page.tsx`
- Modify: `apps/web/app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Rewrite clients page**

Replace `apps/web/app/(dashboard)/clients/page.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { Search, Plus, Building2, TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  company: string
  industry: string
  email: string
  score: number
  proposals: number
}

const MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'María López', company: 'TechCorp SA', industry: 'Tecnología', email: 'maria@techcorp.com', score: 85, proposals: 4 },
  { id: '2', name: 'Carlos Mendoza', company: 'Retail Plus', industry: 'Retail', email: 'carlos@retailplus.com', score: 72, proposals: 2 },
  { id: '3', name: 'Ana García', company: 'HealthMed', industry: 'Salud', email: 'ana@healthmed.com', score: 91, proposals: 6 },
  { id: '4', name: 'Luis Torres', company: 'EduTech', industry: 'Educación', email: 'luis@edutech.com', score: 64, proposals: 1 },
  { id: '5', name: 'Sofia Rodríguez', company: 'FinCorp', industry: 'Finanzas', email: 'sofia@fincorp.com', score: 88, proposals: 3 },
  { id: '6', name: 'Pablo Jiménez', company: 'LogiPro', industry: 'Logística', email: 'pablo@logipro.com', score: 77, proposals: 5 },
]

const INDUSTRIES = ['Todas', 'Tecnología', 'Retail', 'Salud', 'Educación', 'Finanzas', 'Logística']

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
]

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('Todas')

  const filtered = MOCK_CLIENTS.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
    const matchIndustry = industry === 'Todas' || c.industry === industry
    return matchSearch && matchIndustry
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{MOCK_CLIENTS.length} clientes registrados</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors">
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm w-64"
            placeholder="Buscar cliente o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustry(ind)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
                industry === ind
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client, i) => (
          <div
            key={client.id}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`h-11 w-11 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-white font-bold text-sm">
                  {client.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500 truncate">{client.company}</p>
                </div>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                {client.industry}
              </span>
            </div>

            {/* Score */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Oportunidad
                </span>
                <span className="text-xs font-bold text-gray-900">{client.score}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1D9E75] rounded-full"
                  style={{ width: `${client.score}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {client.proposals} propuesta{client.proposals !== 1 ? 's' : ''}
              </span>
              <button className="text-xs text-[#1D9E75] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Ver propuestas →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite analytics page**

Replace `apps/web/app/(dashboard)/analytics/page.tsx` with:

```tsx
'use client'

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { FileText, CheckCircle2, DollarSign, TrendingUp, Clock, Users } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'

const LINE_DATA = [
  { month: 'May', enviadas: 6, aceptadas: 4 },
  { month: 'Jun', enviadas: 9, aceptadas: 5 },
  { month: 'Jul', enviadas: 11, aceptadas: 7 },
  { month: 'Ago', enviadas: 8, aceptadas: 6 },
  { month: 'Sep', enviadas: 14, aceptadas: 9 },
  { month: 'Oct', enviadas: 10, aceptadas: 8 },
  { month: 'Nov', enviadas: 13, aceptadas: 10 },
  { month: 'Dic', enviadas: 16, aceptadas: 12 },
  { month: 'Ene', enviadas: 9, aceptadas: 6 },
  { month: 'Feb', enviadas: 18, aceptadas: 14 },
  { month: 'Mar', enviadas: 12, aceptadas: 9 },
  { month: 'Abr', enviadas: 7, aceptadas: 6 },
]

const BAR_INDUSTRY = [
  { industry: 'Tecnología', value: 42000 },
  { industry: 'Retail', value: 28000 },
  { industry: 'Salud', value: 35000 },
  { industry: 'Finanzas', value: 51000 },
  { industry: 'Logística', value: 19000 },
]

const DONUT_STATUS = [
  { name: 'Aceptadas', value: 41, color: '#1D9E75' },
  { name: 'Enviadas', value: 27, color: '#2563EB' },
  { name: 'Borrador', value: 20, color: '#94A3B8' },
  { name: 'Rechazadas', value: 12, color: '#FCA5A5' },
]

const TOP_CLIENTS = [
  { name: 'FinCorp', company: 'FinCorp', proposals: 3, value: '$51,000', rate: '100%' },
  { name: 'TechCorp SA', company: 'Tecnología', proposals: 4, value: '$42,000', rate: '75%' },
  { name: 'HealthMed', company: 'Salud', proposals: 6, value: '$35,000', rate: '83%' },
  { name: 'Retail Plus', company: 'Retail', proposals: 2, value: '$28,000', rate: '50%' },
  { name: 'LogiPro', company: 'Logística', proposals: 5, value: '$19,000', rate: '60%' },
]

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
        <p className="text-sm text-gray-500 mt-0.5">Métricas de rendimiento de tus propuestas.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total propuestas" value={143} icon={FileText} trend={18} />
        <StatCard label="Tasa de cierre" value="67%" icon={TrendingUp} trend={5} iconColor="#1D9E75" iconBg="#e6f7f2" />
        <StatCard label="Valor promedio" value="$8.2K" icon={DollarSign} trend={12} iconColor="#7C3AED" iconBg="#F5F3FF" />
        <StatCard label="Aceptadas" value={96} icon={CheckCircle2} trend={22} iconColor="#1D9E75" iconBg="#e6f7f2" />
        <StatCard label="Tiempo promedio" value="2.4 días" icon={Clock} trend={-8} iconColor="#F59E0B" iconBg="#FFFBEB" />
        <StatCard label="Clientes activos" value={24} icon={Users} trend={15} iconColor="#2563EB" iconBg="#EFF6FF" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Line chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Enviadas vs. Aceptadas — 12 meses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={LINE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="enviadas" stroke="#94A3B8" strokeWidth={2} dot={false} name="Enviadas" />
              <Line type="monotone" dataKey="aceptadas" stroke="#1D9E75" strokeWidth={2} dot={false} name="Aceptadas" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Por estado</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={DONUT_STATUS} cx="50%" cy="50%" innerRadius={45} outerRadius={62} dataKey="value" strokeWidth={0}>
                {DONUT_STATUS.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {DONUT_STATUS.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-500 flex-1">{item.name}</span>
                <span className="text-xs font-bold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart + Top clients */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Valor por industria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={BAR_INDUSTRY} layout="vertical" barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
              <YAxis type="category" dataKey="industry" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Valor']} />
              <Bar dataKey="value" fill="#1D9E75" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top clients table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top clientes por valor</h3>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left pb-3 font-semibold">Cliente</th>
                <th className="text-right pb-3 font-semibold">Propuestas</th>
                <th className="text-right pb-3 font-semibold">Valor</th>
                <th className="text-right pb-3 font-semibold">Cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {TOP_CLIENTS.map((client) => (
                <tr key={client.name}>
                  <td className="py-2.5">
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-400">{client.company}</p>
                  </td>
                  <td className="py-2.5 text-right text-sm text-gray-600">{client.proposals}</td>
                  <td className="py-2.5 text-right text-sm font-semibold text-gray-900">{client.value}</td>
                  <td className="py-2.5 text-right">
                    <span className="text-xs font-semibold text-[#1D9E75]">{client.rate}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "clients\|analytics"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(dashboard\)/clients/ apps/web/app/\(dashboard\)/analytics/
git commit -m "feat: clients grid with scores and analytics page with Recharts"
```

---

## Phase 4 — Verification

### Task 17: Full TypeScript Verification

**Files:** All files (read-only verification)

- [ ] **Step 1: Run full typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```

Expected: no output. If errors appear, fix them before proceeding.

**Common fixes:**

If `framer-motion` types complain, verify the import:
```tsx
// Correct:
import { motion, useInView } from 'framer-motion'
// NOT:
import { motion } from 'framer-motion/dist/framer-motion'
```

If Recharts type errors appear on chart components (common with React 19):
```tsx
// Add this to the problematic component file:
// @ts-expect-error Recharts React 19 compat
```

If `useOrganization` from Clerk causes issues, add optional chaining:
```tsx
const { organization } = useOrganization()
// Use: organization?.name instead of organization.name
```

- [ ] **Step 2: Start dev server and visual check**

```bash
pnpm --filter web dev
```

Open and verify each route:
- `http://localhost:3000` → Landing page with all 8 sections
- `http://localhost:3000/dashboard` → Stat cards, charts, recent proposals
- `http://localhost:3000/proposals` → Table with search, filters, row actions
- `http://localhost:3000/proposals/new` → Two-column wizard with progress panel
- `http://localhost:3000/clients` → Client grid with scores
- `http://localhost:3000/analytics` → All Recharts charts render

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete frontend redesign — design system, landing, wizard, app screens"
```

---

## Success Criteria Checklist

- [ ] Landing page renders at `/` without authentication — 8 sections visible
- [ ] Navbar sticks on scroll with blur effect
- [ ] Sidebar collapses to icon-only, active link shows green left border
- [ ] Wizard shows two-column layout (progress panel left, content right)
- [ ] Step 3 renders dark panel with animated Framer Motion section rows
- [ ] Step 4 shows document-style preview with export sidebar
- [ ] Dashboard shows 4 stat cards + donut chart + bar chart + recent proposals
- [ ] Proposals table shows with search, status filter, row dropdown menu
- [ ] Clients shows 3-column responsive grid with score bars
- [ ] Analytics shows 6 KPI cards + line + bar + donut charts + top clients table
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] No console errors in browser dev tools
