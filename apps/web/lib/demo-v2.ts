/**
 * Demo v2 — mock data for the new 7-step flow.
 *
 * This file is INDEPENDENT of the real Supabase backend so the new pages
 * (/company, /services, /tracking, /p/[token]) can render without DB tables.
 * Once the schema is migrated, these pages will switch to API calls.
 */
import type { CompanyProfile } from './types/company'
import type { Service } from './types/service'
import type { TrackedProposal, ProposalView, ProposalAlert } from './types/proposal-tracking'

// ─── Provider Company (the seller) ──────────────────────────────────────────
export const DEMO_COMPANY: CompanyProfile = {
  id: 'company-demo-1',
  tenant_id: 'demo',
  name: 'Andes Digital Studio',
  website: 'https://andesdigital.cl',
  email: 'hola@andesdigital.cl',
  phone: '+56 9 1234 5678',
  country: 'Chile',
  currency: 'USD',
  instagram: '@andesdigital',
  facebook: 'andesdigitalstudio',
  linkedin: 'company/andes-digital',
  tiktok: '@andesdigital',
  what_we_do: 'Estudio digital especializado en growth para pymes y startups B2B en LATAM. Diseñamos, desarrollamos y escalamos su presencia digital con foco en resultados medibles.',
  purpose: 'Hacer que las marcas LATAM compitan con las grandes ligas digitales sin presupuestos de Silicon Valley.',
  differentiators: [
    'Equipo 100% LATAM con experiencia en EE.UU.',
    'Modelo de squads dedicados por cliente',
    'Reportería semanal con métricas de negocio (no de vanity)',
    'Garantía de resultado en primeros 90 días',
  ],
  ideal_clients: 'Pymes con facturación entre $500K y $5M USD anuales, B2B preferentemente, que necesitan profesionalizar su marketing digital.',
  focus_industries: ['Tecnología', 'SaaS', 'Salud', 'Educación', 'Servicios profesionales'],
  logo_url: '',
  brand_manual_url: '',
  example_proposal_url: '',
  primary_color: '#1D9E75',
  secondary_color: '#0F172A',
  accent_color: '#F59E0B',
  font_heading: 'Inter',
  font_body: 'Inter',
  has_brand_manual: false,
  has_example_proposal: false,
  onboarding_completed: true,
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-04-15T15:30:00Z',
}

// ─── Service Catalog ─────────────────────────────────────────────────────────
export const DEMO_SERVICES: Service[] = [
  {
    id: 'svc-1',
    tenant_id: 'demo',
    company_id: 'company-demo-1',
    name: 'Paid Media (Google + Meta Ads)',
    category: 'Marketing Digital',
    description: 'Gestión completa de campañas pagadas en Google y Meta con optimización semanal.',
    objective: 'Generar leads calificados a un CAC competitivo y escalar el canal pagado.',
    scope: 'Auditoría + setup + 15 anuncios mensuales por plataforma + reportería quincenal.',
    includes: [
      'Auditoría de cuentas existentes',
      'Definición de audiencias',
      '15 variantes de anuncios/mes por plataforma',
      'Optimización semanal de bids y presupuesto',
      'Dashboard en tiempo real',
    ],
    excludes: [
      'Presupuesto de medios (ad spend)',
      'Producción de video',
      'Diseño de landing pages',
    ],
    duration_estimate: 'Mensual recurrente',
    deliverables: ['Setup de tracking', 'Plan de campañas', 'Reporte quincenal', 'Dashboard live'],
    base_price: 1500,
    currency: 'USD',
    customizable: true,
    billing_type: 'monthly',
    desired_margin: 35,
    active: true,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'svc-2',
    tenant_id: 'demo',
    company_id: 'company-demo-1',
    name: 'Landing Pages de Alta Conversión',
    category: 'Diseño',
    description: 'Diseño y desarrollo de landing pages optimizadas para conversión con A/B testing.',
    objective: 'Aumentar la tasa de conversión del tráfico pagado al 4%+.',
    scope: '1 landing page responsive con A/B test, integración a CRM y analytics.',
    includes: [
      'Wireframe + diseño UI',
      'Desarrollo Next.js o Webflow',
      'Integración con HubSpot / Pipedrive',
      'A/B testing primer mes',
      'Heatmaps y session recordings',
    ],
    excludes: ['Hosting recurrente', 'Mantención post mes 1'],
    duration_estimate: '3 semanas',
    deliverables: ['Landing live', 'Documentación técnica', 'Reporte de A/B test'],
    base_price: 2200,
    currency: 'USD',
    customizable: true,
    billing_type: 'one_time',
    desired_margin: 45,
    active: true,
    created_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'svc-3',
    tenant_id: 'demo',
    company_id: 'company-demo-1',
    name: 'SEO Técnico + Content Marketing',
    category: 'Marketing Digital',
    description: 'Optimización técnica del sitio + estrategia de contenidos para tráfico orgánico.',
    objective: 'Posicionar 50 keywords transaccionales en Top 10 de Google en 6 meses.',
    scope: 'Auditoría técnica + 12 artículos mensuales + linkbuilding orgánico.',
    includes: [
      'Auditoría SEO técnico',
      'Optimización de schema markup',
      '12 artículos/mes optimizados',
      'Estrategia de linkbuilding',
      'Reporte mensual de rankings',
    ],
    excludes: ['Traducciones', 'Costos de directorios premium'],
    duration_estimate: 'Mensual recurrente',
    deliverables: ['Plan editorial', 'Artículos publicados', 'Reporte mensual'],
    base_price: 1800,
    currency: 'USD',
    customizable: true,
    billing_type: 'monthly',
    desired_margin: 40,
    active: true,
    created_at: '2026-01-25T10:00:00Z',
  },
  {
    id: 'svc-4',
    tenant_id: 'demo',
    company_id: 'company-demo-1',
    name: 'Branding y Diseño de Identidad',
    category: 'Branding',
    description: 'Sistema completo de identidad visual con manual de marca aplicable.',
    objective: 'Construir una marca diferencial y reconocible en el mercado.',
    scope: 'Logo + paleta + tipografías + manual + 5 piezas iniciales.',
    includes: [
      'Workshop de marca',
      'Logo (3 propuestas + ajustes)',
      'Paleta cromática y tipografías',
      'Manual de marca (PDF + Figma)',
      '5 piezas iniciales (cards, banners, post)',
    ],
    excludes: ['Producción de video', 'Fotografía profesional'],
    duration_estimate: '6 semanas',
    deliverables: ['Manual de marca completo', 'Assets en alta resolución', 'Archivos editables'],
    base_price: 3500,
    currency: 'USD',
    customizable: true,
    billing_type: 'one_time',
    desired_margin: 50,
    active: true,
    created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'svc-5',
    tenant_id: 'demo',
    company_id: 'company-demo-1',
    name: 'Social Media Management',
    category: 'Social Media',
    description: 'Gestión integral de redes sociales con calendarios mensuales y community.',
    objective: 'Construir comunidad orgánica y aumentar engagement en 60% en 6 meses.',
    scope: '20 posts/mes + community management + reportería mensual.',
    includes: [
      'Estrategia editorial mensual',
      '20 posts/mes (Instagram + LinkedIn)',
      'Stories diarias',
      'Community management',
      'Reporte mensual',
    ],
    excludes: ['Producción de video largo', 'Influencer marketing'],
    duration_estimate: 'Mensual recurrente',
    deliverables: ['Calendario editorial', 'Posts publicados', 'Reporte de métricas'],
    base_price: 1200,
    currency: 'USD',
    customizable: true,
    billing_type: 'monthly',
    desired_margin: 35,
    active: true,
    created_at: '2026-02-10T10:00:00Z',
  },
  {
    id: 'svc-6',
    tenant_id: 'demo',
    company_id: 'company-demo-1',
    name: 'Email Marketing + Automation',
    category: 'Marketing Digital',
    description: 'Implementación de flujos de email marketing y automatización de leads.',
    objective: 'Recuperar 25% de carritos abandonados y nurturing de leads MQL → SQL.',
    scope: 'Setup HubSpot/MailChimp + 5 flujos automáticos + 4 campañas mensuales.',
    includes: [
      'Setup de plataforma',
      '5 flujos automáticos (welcome, nurturing, win-back, etc.)',
      '4 campañas mensuales',
      'Segmentación avanzada',
      'A/B testing de subject lines',
    ],
    excludes: ['Costo de plataforma', 'Producción de imágenes custom'],
    duration_estimate: 'Mensual recurrente',
    deliverables: ['Flujos configurados', 'Templates HTML', 'Reporte mensual'],
    base_price: 950,
    currency: 'USD',
    customizable: true,
    billing_type: 'monthly',
    desired_margin: 40,
    active: true,
    created_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'svc-7',
    tenant_id: 'demo',
    company_id: 'company-demo-1',
    name: 'Web Development (Next.js)',
    category: 'Desarrollo',
    description: 'Desarrollo web moderno con stack Next.js + Vercel + Supabase.',
    objective: 'Sitio web profesional, rápido (Lighthouse 90+) y escalable.',
    scope: 'Sitio de 5-10 páginas con CMS, SEO y analytics.',
    includes: [
      'UX research + wireframes',
      'Diseño UI (Figma)',
      'Desarrollo Next.js 16',
      'CMS headless (Sanity)',
      'Deploy en Vercel + dominio',
    ],
    excludes: ['Costo de Vercel/dominio', 'Mantención post-launch'],
    duration_estimate: '8 semanas',
    deliverables: ['Sitio live', 'Repositorio Git', 'Documentación técnica'],
    base_price: 5500,
    currency: 'USD',
    customizable: true,
    billing_type: 'project',
    desired_margin: 45,
    active: true,
    created_at: '2026-02-20T10:00:00Z',
  },
  {
    id: 'svc-8',
    tenant_id: 'demo',
    company_id: 'company-demo-1',
    name: 'Auditoría Estratégica Digital',
    category: 'Estrategia',
    description: 'Diagnóstico completo de tu presencia digital con plan de acción 90 días.',
    objective: 'Detectar oportunidades de quick-wins y plan de crecimiento medible.',
    scope: 'Auditoría de 360° + workshop ejecutivo + plan trimestral.',
    includes: [
      'Auditoría web, SEO, social, paid',
      'Análisis competencia (top 5)',
      'Workshop ejecutivo (3 horas)',
      'Plan de acción 90 días',
      'KPIs y métricas objetivo',
    ],
    excludes: ['Implementación del plan'],
    duration_estimate: '2 semanas',
    deliverables: ['Reporte ejecutivo (40+ slides)', 'Plan de acción priorizado', 'Workshop grabado'],
    base_price: 1800,
    currency: 'USD',
    customizable: false,
    billing_type: 'one_time',
    desired_margin: 60,
    active: true,
    created_at: '2026-02-25T10:00:00Z',
  },
]

export function getServices(): Service[] {
  return DEMO_SERVICES
}

export function getServiceById(id: string): Service | undefined {
  return DEMO_SERVICES.find((s) => s.id === id)
}

// ─── Tracked proposals (with share tokens) ──────────────────────────────────
const now = Date.now()
const day = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString()
const hour = (n: number) => new Date(now - n * 60 * 60 * 1000).toISOString()

export const DEMO_TRACKED: TrackedProposal[] = [
  {
    id: 'demo-prop-1',
    title: 'Propuesta Paid Media + Landing Page — TechFlow',
    client_name: 'María García',
    client_email: 'maria@techflow.cl',
    client_phone: '+56 9 8765 4321',
    share_token: 'tok_techflow_2026_a1b2',
    share_url: '/p/tok_techflow_2026_a1b2',
    sent_at: day(7),
    opened_at: day(6),
    last_viewed_at: hour(12),
    view_count: 4,
    total_view_seconds: 480,
    intention_score: 'high',
    status: 'accepted',
    budget: 3500,
    sections_viewed: { pricing: true, cases: true, cta: true },
  },
  {
    id: 'demo-prop-2',
    title: 'Propuesta SEO + Content — Retail Plus',
    client_name: 'Carlos Mendoza',
    client_email: 'carlos@retailplus.cl',
    client_phone: '+56 9 5432 1098',
    share_token: 'tok_retailplus_2026_c3d4',
    share_url: '/p/tok_retailplus_2026_c3d4',
    sent_at: day(5),
    opened_at: day(5),
    last_viewed_at: day(5),
    view_count: 1,
    total_view_seconds: 45,
    intention_score: 'medium',
    status: 'sent',
    budget: 2800,
    sections_viewed: { pricing: false, cases: true, cta: false },
  },
  {
    id: 'demo-prop-3',
    title: 'Propuesta Estrategia Integral — Grupo Andino',
    client_name: 'Ana Rodríguez',
    client_email: 'ana@grupoandino.cl',
    share_token: 'tok_grupoandino_2026_e5f6',
    share_url: '/p/tok_grupoandino_2026_e5f6',
    sent_at: day(3),
    opened_at: day(3),
    last_viewed_at: hour(2),
    view_count: 3,
    total_view_seconds: 320,
    intention_score: 'high',
    status: 'accepted',
    budget: 5200,
    sections_viewed: { pricing: true, cases: true, cta: false },
  },
  {
    id: 'demo-prop-4',
    title: 'Propuesta Branding — FoodTech',
    client_name: 'Roberto Silva',
    client_email: 'roberto@foodtech.cl',
    share_token: 'tok_foodtech_2026_g7h8',
    share_url: '/p/tok_foodtech_2026_g7h8',
    sent_at: day(2),
    opened_at: null,
    last_viewed_at: null,
    view_count: 0,
    total_view_seconds: 0,
    intention_score: 'none',
    status: 'sent',
    budget: 2900,
    sections_viewed: { pricing: false, cases: false, cta: false },
  },
  {
    id: 'demo-prop-5',
    title: 'Propuesta Social Media — Innova Labs',
    client_name: 'Valentina Torres',
    client_email: 'valentina@innovalabs.cl',
    client_phone: '+56 9 1111 2222',
    share_token: 'tok_innovalabs_2026_i9j0',
    share_url: '/p/tok_innovalabs_2026_i9j0',
    sent_at: day(1),
    opened_at: hour(5),
    last_viewed_at: hour(5),
    view_count: 1,
    total_view_seconds: 8,
    intention_score: 'low',
    status: 'sent',
    budget: 1200,
    sections_viewed: { pricing: false, cases: false, cta: false },
  },
  {
    id: 'demo-prop-6',
    title: 'Propuesta Web Development — DataLab',
    client_name: 'Sebastián Pérez',
    client_email: 'sebastian@datalab.cl',
    share_token: 'tok_datalab_2026_k1l2',
    share_url: '/p/tok_datalab_2026_k1l2',
    sent_at: day(6),
    opened_at: null,
    last_viewed_at: null,
    view_count: 0,
    total_view_seconds: 0,
    intention_score: 'none',
    status: 'sent',
    budget: 5500,
    sections_viewed: { pricing: false, cases: false, cta: false },
  },
]

export function getTrackedProposals(): TrackedProposal[] {
  return DEMO_TRACKED
}

export function findByShareToken(token: string): TrackedProposal | undefined {
  return DEMO_TRACKED.find((p) => p.share_token === token)
}

// ─── Demo alerts ────────────────────────────────────────────────────────────
export const DEMO_ALERTS: ProposalAlert[] = [
  {
    id: 'alert-1',
    tenant_id: 'demo',
    proposal_id: 'demo-prop-1',
    type: 'reopened',
    message: 'María García volvió a abrir tu propuesta hace 12 horas',
    read: false,
    created_at: hour(12),
  },
  {
    id: 'alert-2',
    tenant_id: 'demo',
    proposal_id: 'demo-prop-3',
    type: 'pricing_viewed',
    message: 'Ana Rodríguez revisó la sección de Inversión por 1:20 min',
    read: false,
    created_at: hour(2),
  },
  {
    id: 'alert-3',
    tenant_id: 'demo',
    proposal_id: 'demo-prop-4',
    type: 'no_open_5d',
    message: 'Roberto Silva no ha abierto la propuesta hace 2 días — envía recordatorio',
    read: false,
    created_at: day(2),
  },
  {
    id: 'alert-4',
    tenant_id: 'demo',
    proposal_id: 'demo-prop-1',
    type: 'case_viewed',
    message: 'María García vio caso de éxito por 2:15 min',
    read: true,
    created_at: day(1),
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────
export function computeIntention(
  viewCount: number,
  totalSeconds: number,
  pricingViewed: boolean,
): 'high' | 'medium' | 'low' | 'none' {
  if (viewCount === 0) return 'none'
  if (viewCount >= 2 && totalSeconds > 60 && pricingViewed) return 'high'
  if (viewCount >= 1 && totalSeconds > 15) return 'medium'
  return 'low'
}

export function suggestFollowUp(p: TrackedProposal): {
  channel: 'email' | 'whatsapp'
  subject?: string
  message: string
  reasoning: string
} {
  const firstName = p.client_name.split(' ')[0]
  if (p.view_count === 0) {
    return {
      channel: 'email',
      subject: 'Te comparto nuevamente esto',
      message: `Hola ${firstName}, te dejo nuevamente la propuesta de ${p.title.split(' — ')[0]} por si no alcanzaste a verla. ¿Podemos coordinar 15 min esta semana?`,
      reasoning: 'No abrió la propuesta — recordatorio sutil',
    }
  }
  if (p.intention_score === 'high') {
    return {
      channel: 'whatsapp',
      message: `Hola ${firstName}, vi que estuviste revisando la propuesta. ¿Coordinamos 15 min y resolvemos las dudas que tengas?`,
      reasoning: 'Alta intención — viste pricing y volviste',
    }
  }
  if (p.sections_viewed.pricing) {
    return {
      channel: 'email',
      subject: 'Opciones flexibles disponibles',
      message: `Hola ${firstName}, quedo atento por si quieres revisar opciones, ajustes en el alcance o un plan por fases.`,
      reasoning: 'Vio pricing — sensibilidad al precio',
    }
  }
  return {
    channel: 'email',
    subject: 'Por aquí cuando lo necesites',
    message: `Hola ${firstName}, ¿alguna duda de la propuesta? Quedo atento.`,
    reasoning: 'Vista parcial — seguimiento neutral',
  }
}
