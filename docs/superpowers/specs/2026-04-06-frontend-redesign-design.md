# Frontend Redesign — Smart Proposal Generator
**Date:** 2026-04-06  
**Status:** Approved  
**Scope:** Design System + Landing Page + App (Wizard + Dashboard + Proposals + Clients + Analytics)

---

## 1. Overview

Full frontend redesign of the Smart Proposal Generator SaaS, inspired by PandaDoc's enterprise-clean aesthetic. The redesign covers:

1. A unified **design system** (tokens, shadcn/ui, dark sidebar)
2. A polished **landing page** (8 sections, public, no auth required)
3. **Wizard 4-step redesign** (the core product experience)
4. **Dashboard, Proposals list, Clients, Analytics** app screens

**Approach:** Design System First — tokens and component library are established before building pages. Three agents work in parallel: (A) design system + layout shell, (B) landing page, (C) wizard redesign.

---

## 2. Design System

### 2.1 Color Tokens (`globals.css` + `@theme`)

```css
/* Brand */
--color-brand:        #1D9E75   /* CTAs, checkmarks, success, primary buttons */
--color-brand-dark:   #158a63   /* CTA hover */
--color-brand-light:  #e6f7f2   /* selection backgrounds, success badges */

/* Info / State */
--color-info:         #2563EB   /* info states, links, data icons */
--color-info-light:   #EFF6FF   /* info card backgrounds */

/* Sidebar */
--color-sidebar:      #0F172A   /* dark sidebar background (Slate 900) */
--color-sidebar-text: #94A3B8   /* inactive sidebar text */
--color-sidebar-active:#F8FAFC  /* active sidebar text */
--color-sidebar-hover: #1E293B  /* hover + active item background (Slate 800) */

/* Surfaces */
--color-surface:      #FFFFFF   /* cards, panels */
--color-background:   #F8FAFC   /* general app background */
--color-border:       #E2E8F0   /* soft borders */

/* Text */
--color-text-primary: #0F172A   /* headings */
--color-text-secondary:#64748B  /* descriptions, labels */
```

### 2.2 Typography

Font: **Geist Sans** (already installed). Scale:
- `text-xs` (11px) — uppercase labels, metadata
- `text-sm` (14px) — body, table content
- `text-base` (16px) — paragraphs, card body
- `text-xl` (20px) — h3, card titles
- `text-2xl` (24px) — page headings
- `text-4xl` (36px) — hero headline (landing)

### 2.3 shadcn/ui Components to Install

```
button · input · textarea · badge · card · dialog · dropdown-menu
tooltip · command · separator · skeleton · progress · tabs
avatar · sonner (toast) · accordion · sheet (slide-over)
```

Install command:
```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input textarea badge card dialog \
  dropdown-menu tooltip command separator skeleton progress tabs \
  avatar sonner accordion sheet
```

shadcn config: `style=default`, `baseColor=slate`, `cssVariables=true`.
After install, override CSS variables in `globals.css` with the token palette above.

### 2.4 Sidebar — Dark Layout Shell

**Structure:**
```
[Logo "SPG" — white on dark]
────────────────────────────
▸ Dashboard        (LayoutDashboard)
▸ Propuestas       (FileText)  [badge: count]
▸ Clientes         (Users)
▸ Analítica        (BarChart3)
────────────────────────────
[UserButton Clerk + org name]
[Settings icon]
```

**Specs:**
- Width: `w-60` fixed on desktop, collapsible to `w-16` (icon-only) via toggle button
- Active link: `bg-sidebar-hover`, white text, `border-l-[3px] border-brand`
- Hover: `bg-sidebar-hover` with 150ms transition
- Collapse state persisted in `localStorage`
- Collapse toggle: `ChevronLeft` icon button at bottom of sidebar

**File:** `apps/web/components/layout/Sidebar.tsx` (client component, uses `usePathname`)  
**Shell:** `apps/web/app/(dashboard)/layout.tsx` wraps Sidebar + `<main>`

---

## 3. Landing Page (`/`)

**Route:** `apps/web/app/(marketing)/page.tsx`  
**Layout:** `apps/web/app/(marketing)/layout.tsx` (no auth, no sidebar)

### 3.1 Navbar
- Sticky, `backdrop-blur-sm bg-white/80`, border-bottom on scroll
- Logo + nav links (`Características`, `Precios`, `Integraciones`, `FAQ`)
- Right: `Iniciar sesión` (ghost button) + `Empezar gratis` (brand green, filled)
- Mobile: hamburger → Sheet slide-over with full nav

### 3.2 Hero
- **Headline:** "Propuestas ganadoras, generadas en minutos"
- **Subheadline:** "Analiza tu cliente, genera con Claude AI y exporta en PDF o Word. Para equipos de ventas en LATAM."
- **CTAs:** `Empezar gratis — es gratis` (green) + `Ver demo` (outline)
- **Visual:** Right side — animated mockup of the wizard Step 3 (streaming effect with Framer Motion `useInView` + stagger)
- Background: subtle grid pattern or gradient from white to `brand-light`

### 3.3 Social Proof — Logos Bar
- Gray background `#F8FAFC`, text: "Utilizado por equipos de ventas en toda LATAM"
- 6-8 company/industry logos (placeholder SVGs, grayscale)

### 3.4 Cómo Funciona (3 Steps)
- Horizontal numbered cards: `① Elige el cliente` → `② Claude genera` → `③ Exporta y cierra`
- Each card: large colored number, icon, title, 2-line description
- Connector arrows between cards

### 3.5 Features Grid (6 Features)
3×2 grid of feature cards:
1. **Streaming IA** — Genera propuestas en tiempo real con Claude Sonnet
2. **Multi-tenant** — Organizaciones separadas, datos aislados
3. **Export PDF/Word** — Descarga con un clic, formato profesional
4. **Templates por industria** — Software, consultoría, marketing, cloud y más
5. **Analytics de propuestas** — Mide tasas de cierre y valor generado
6. **Integración con email** — Envía directamente desde la plataforma con Resend

Each card: green icon, bold title, 2-line description, `border border-gray-100 rounded-2xl p-6`.

### 3.6 Pricing Table

| | Free | Pro ★ | Enterprise |
|--|--|--|--|
| Precio | $0/mes | $49/mes | Consultar |
| Propuestas | 3/mes | Ilimitadas | Ilimitadas |
| Usuarios | 1 | 5 | ∞ |
| Templates | Básicos | Todos + IA | Custom |
| Analytics | — | ✓ | ✓ avanzado |
| Soporte | Email | Prioritario | SLA dedicado |
| API | — | — | ✓ |
| CTA | Empezar | Empezar gratis | Contactar |

Pro plan: `border-2 border-brand`, badge "Más popular" verde, shadow-lg.

### 3.7 Integrations Showcase
- Dark background (same as sidebar `#0F172A`)
- Title: "Construido con las mejores herramientas"
- 7 integration logos in white/gray: Anthropic Claude · Clerk · Stripe · Supabase · Upstash · Resend · DocuForge

### 3.8 FAQ
- 6 questions in shadcn `Accordion`:
  1. ¿Qué pasa cuando se acaban mis propuestas en el plan Free?
  2. ¿Puedo cancelar en cualquier momento?
  3. ¿Mis datos están seguros? ¿Cómo funciona el multi-tenant?
  4. ¿En qué idiomas genera propuestas?
  5. ¿Puedo personalizar el template con mi logo?
  6. ¿Hay soporte en español?

### 3.9 CTA Final
- Green gradient background (`brand` → `brand-dark`)
- Headline: "¿Listo para cerrar más ventas?"
- White filled button: "Empezar gratis hoy"

### 3.10 Footer
- 4-column: Logo+tagline · Producto · Empresa · Legal
- Social icons (LinkedIn, Twitter/X)
- Copyright

---

## 4. Wizard Redesign

**Route:** `apps/web/app/(dashboard)/proposals/new/page.tsx`  
**Layout:** Two-column — sticky progress panel (left `w-72`) + scrollable content (right `flex-1`)

### 4.1 Progress Panel (Left)
- White card with soft shadow
- 4 step items: number circle + label + description
- Active step: green filled circle, bold label
- Completed step: green checkmark circle
- Pending step: gray empty circle
- Between steps: vertical connector line (gray → green when done)

### 4.2 Step 1 — Cliente
- shadcn `Command` component for search (keyboard navigable)
- Results: `2-column grid` of client cards with avatar (initial + gradient), name, company, industry badge, opportunity score (progress bar)
- "Crear nuevo cliente" → shadcn `Sheet` slide-over from right with 2-column form
- Continue button enabled only when client selected

### 4.3 Step 2 — Contexto
- **Problema:** Textarea with animated character counter, hint text personalized to client company
- **Template:** 6 cards in 3×2 grid — large emoji icon, label, description. Selected card gets green border + light green bg
- **Budget:** Styled radio button group (5 options)
- **Timeline:** Chip multi-select (5 options)
- **Tono:** 3 cards each showing a sample phrase in that tone style
- Continue enabled when: problema ≥ 20 chars AND template selected

### 4.4 Step 3 — Generación IA
- Dark background panel (`#0F172A`) for drama
- Header: Claude avatar (animated pulse) + "Generando tu propuesta..."
- Progress bar (shadcn `Progress`) tracking sections completed
- 7 section rows: each appears with `framer-motion` fade-up when streaming starts
  - Pending: gray empty circle
  - Streaming: green spinner + shimmer text placeholder  
  - Done: green checkmark + first 60 chars of content
- Bottom: "Esta propuesta usa Claude Sonnet · ~30 segundos"
- Continue enabled when `isLoading === false` AND all 7 sections present

### 4.5 Step 4 — Vista de Documento Premium
- **Document preview:** White card with page shadow, `max-w-2xl mx-auto`
  - Document header: Client logo placeholder + company name + date + proposal title
  - Sections with document typography: `text-lg font-bold` heading, `text-base leading-relaxed` body
  - "Generado con Claude AI" badge at bottom
- **Actions sidebar (right, sticky):** 
  - Export PDF button (green, primary)
  - Export Word button (outline)
  - Send by Email button (outline)
  - Share link button (ghost)
  - Divider
  - "Nueva propuesta" button

---

## 5. Remaining App Screens

### 5.1 Dashboard Home (`/dashboard`)
**Layout:** Full-width, padding `p-6`

- **Header:** "Buenos días, [FirstName]" + date + `+ Nueva propuesta` button (right)
- **Stat cards row (4):** Propuestas totales · Aceptadas · En revisión · Valor total ($)
  - Each: icon (blue), big number, label, trend indicator (+12% vs last month)
- **Middle row (2 cols):**
  - Left: "Actividad reciente" — last 5 proposals as list rows (title, client, status badge, date)
  - Right: "Tasa de cierre" — Recharts Donut with center percentage
- **Bottom:** "Propuestas por mes" — Recharts BarChart, 6 months, two bars (sent vs accepted)

### 5.2 Proposals List (`/proposals`)
TanStack Table with shadcn styling:
- **Columns:** # · Título · Cliente · Estado · Valor · Fecha · Acciones (3-dot menu)
- **Status badges:** `draft`=gray · `sent`=blue · `accepted`=green · `rejected`=red
- **Toolbar:** Search input + Status filter dropdown + Date range picker
- **Row actions (DropdownMenu):** Ver · Duplicar · Archivar · Eliminar
- **Empty state:** Centered illustration + "Aún no tienes propuestas" + CTA button
- **Pagination:** shadcn pagination component, 10 rows/page default

### 5.3 Clients Page (`/clients`)
- **Toolbar:** Search + Industry filter tabs + `+ Nuevo cliente` button
- **Grid:** `grid-cols-3` desktop / `grid-cols-2` tablet / `grid-cols-1` mobile
- **Client card:** Avatar initial + gradient background · name bold · company · industry badge · opportunity score bar (green) · on hover: overlay with "Ver propuestas" button
- New client: same Sheet slide-over as in wizard Step 1 (shared component)

### 5.4 Analytics (`/analytics`)
- **KPI row:** 6 stat cards (more detailed than dashboard)
- **Charts:**
  - Line chart: Propuestas enviadas vs aceptadas (last 12 months)
  - Bar chart: Valor por industria
  - Donut: Distribución de estados
- **Table:** Top 5 clientes por valor total generado
- All charts: Recharts, consistent color scheme (brand green + info blue + gray)

---

## 6. File Structure (New Files)

```
apps/web/
├── app/
│   ├── (marketing)/          ← NEW route group
│   │   ├── layout.tsx        ← No auth, no sidebar
│   │   └── page.tsx          ← Landing page
│   └── (dashboard)/
│       ├── layout.tsx        ← Updated: new Sidebar
│       ├── dashboard/page.tsx ← Updated: stat cards + charts
│       ├── proposals/
│       │   ├── page.tsx      ← Updated: TanStack table
│       │   └── new/page.tsx  ← Updated: new wizard layout
│       ├── clients/page.tsx  ← Updated: client grid
│       └── analytics/page.tsx← Updated: charts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx       ← NEW: dark collapsible sidebar
│   │   └── TopBar.tsx        ← NEW: optional top bar
│   ├── landing/
│   │   ├── Navbar.tsx        ← NEW
│   │   ├── Hero.tsx          ← NEW
│   │   ├── SocialProof.tsx   ← NEW
│   │   ├── HowItWorks.tsx    ← NEW
│   │   ├── FeaturesGrid.tsx  ← NEW
│   │   ├── PricingTable.tsx  ← NEW
│   │   ├── Integrations.tsx  ← NEW
│   │   ├── FAQ.tsx           ← NEW
│   │   ├── CTAFinal.tsx      ← NEW
│   │   └── Footer.tsx        ← NEW
│   ├── wizard/
│   │   ├── ProposalWizard.tsx← UPDATED: two-col layout
│   │   ├── WizardProgress.tsx← NEW: left panel
│   │   ├── Step1Client.tsx   ← UPDATED: Command + Sheet
│   │   ├── Step2Context.tsx  ← UPDATED: redesigned
│   │   ├── Step3Generate.tsx ← UPDATED: dark panel + animations
│   │   └── Step4Review.tsx   ← UPDATED: document preview
│   ├── dashboard/
│   │   ├── StatCard.tsx      ← NEW
│   │   ├── RecentProposals.tsx← NEW
│   │   └── ProposalsChart.tsx← NEW
│   └── ui/                   ← shadcn components (generated)
└── lib/
    └── utils.ts              ← Already exists
```

---

## 7. Libraries & Dependencies

| Package | Purpose | Action |
|---------|---------|--------|
| `shadcn/ui` | Component system | Install via CLI |
| `framer-motion` | Animations (already in package.json) | Already installed |
| `recharts` | Charts (already in package.json) | Already installed |
| `@tanstack/react-table` | Data tables (already in package.json) | Already installed |
| `@tiptap/*` | Rich text (already in package.json) | Already installed |
| `lucide-react` | Icons (already in package.json) | Already installed |
| `sonner` | Toast notifications | Install with shadcn |
| `dnd-kit` | Drag & drop (future) | Skip for now (YAGNI) |

---

## 8. Implementation Order (3 Parallel Agents)

### Agent A — Design System + Layout Shell
1. Run `shadcn init` + install all components
2. Update `globals.css` with full token palette
3. Build `Sidebar.tsx` (dark, collapsible, `usePathname` active state)
4. Update `(dashboard)/layout.tsx`
5. Move landing route to `(marketing)` route group

### Agent B — Landing Page
1. `(marketing)/layout.tsx` (Navbar + Footer wrapper)
2. `Navbar.tsx`
3. `Hero.tsx` (with Framer Motion animation)
4. `SocialProof.tsx`, `HowItWorks.tsx`, `FeaturesGrid.tsx`
5. `PricingTable.tsx`
6. `Integrations.tsx`, `FAQ.tsx`, `CTAFinal.tsx`
7. `Footer.tsx`

### Agent C — Wizard + App Screens
1. `WizardProgress.tsx` + `ProposalWizard.tsx` two-col layout
2. `Step1Client.tsx` (Command + Sheet)
3. `Step2Context.tsx`
4. `Step3Generate.tsx` (dark panel + Framer Motion)
5. `Step4Review.tsx` (document preview)
6. `dashboard/page.tsx` (StatCard + charts)
7. `proposals/page.tsx` (TanStack table)
8. `clients/page.tsx` (grid + Sheet)
9. `analytics/page.tsx` (charts)

---

## 9. Success Criteria

- [ ] Landing page renders at `/` without authentication
- [ ] All 8 landing sections visible and responsive
- [ ] Sidebar collapses/expands, active state works correctly
- [ ] Wizard two-column layout renders on all steps
- [ ] Step 3 streaming shows animated sections in dark panel
- [ ] Step 4 shows document-style preview with export buttons
- [ ] Dashboard shows stat cards + charts (with mock data)
- [ ] Proposals list shows TanStack table with filters
- [ ] Clients grid renders with hover states
- [ ] TypeScript typecheck passes (`tsc --noEmit`)
- [ ] No console errors in dev mode
