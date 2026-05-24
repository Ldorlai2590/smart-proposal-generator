'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Building2, Globe, Instagram, Facebook, Linkedin, Sparkles, Loader2, CheckCircle2, AlertTriangle, Target, MessageSquare, TrendingUp, Save } from 'lucide-react'

// Field limits (synced with API Zod)
export const CLIENT_LIMITS = {
  contact_name: 200,
  contact_role: 200,
  contact_email: 200,
  contact_phone: 50,
  company_name: 200,
  website: 500,
  social: 200,
  industry: 100,
  employees: 10,
  revenue: 100,
} as const

const INDUSTRIES = ['Tecnología', 'SaaS', 'Salud', 'Retail', 'Finanzas', 'Educación', 'Inmobiliario', 'Manufactura', 'Servicios profesionales', 'Logística', 'Otros']
const SIZES = [
  { id: 'micro', label: 'Micro', desc: '1-10 empleados' },
  { id: 'pyme', label: 'Pyme', desc: '11-50 empleados' },
  { id: 'mediana', label: 'Mediana', desc: '51-250 empleados' },
  { id: 'corporativo', label: 'Corporativo', desc: '250+ empleados' },
]
const COUNTRIES = ['Chile', 'México', 'Colombia', 'Argentina', 'Perú', 'Otro']

interface AIAnalysis {
  business_model: string
  value_prop: string
  digital_maturity: number  // 0-100
  opportunities: string[]
  weaknesses: string[]
  communication_tone: string
  competitors: string[]
  executive_summary: string
}

export default function NewClientPage() {
  const router = useRouter()

  // Persona contacto
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Empresa
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [country, setCountry] = useState('Chile')
  const [industry, setIndustry] = useState(INDUSTRIES[0])
  const [size, setSize] = useState('pyme')
  const [employees, setEmployees] = useState('')
  const [revenue, setRevenue] = useState('')

  // AI
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAnalyze() {
    if (!website && !instagram && !linkedin) {
      console.warn('Agrega al menos web o una red social para analizar')
      return
    }
    setAnalyzing(true)
    setAnalysis(null)

    // Mock análisis IA — en producción esto llamaría a /api/clients/analyze
    // que usa Firecrawl + Claude para scrapear la web/RRSS y analizar
    await new Promise((r) => setTimeout(r, 2400))

    setAnalysis({
      business_model: industry === 'SaaS' ? 'B2B SaaS recurrente con modelo freemium' : industry === 'Retail' ? 'Retail omnicanal con foco en e-commerce y tiendas físicas' : 'Servicios B2B con modelo por proyecto y retainer mensual',
      value_prop: `${companyName || 'La empresa'} se posiciona como ${industry === 'Tecnología' ? 'partner tecnológico' : 'proveedor especializado'} con foco en pymes de crecimiento acelerado`,
      digital_maturity: Math.floor(Math.random() * 40) + 40, // 40-80
      opportunities: [
        'Bajo posicionamiento orgánico — solo 12% del tráfico es SEO',
        'Landing pages sin tracking de conversión adecuado',
        'Email marketing inactivo hace 6+ meses',
        'Presencia en LinkedIn débil para empresa B2B',
      ],
      weaknesses: [
        'Sitio web con velocidad de carga sobre 5s (benchmark 2.5s)',
        'No tiene CRM integrado con marketing',
        'Falta automation en nurturing de leads',
      ],
      communication_tone: 'Tono profesional pero distante. Comunicación corporativa estándar, sin diferenciación clara.',
      competitors: ['Competidor A (líder mercado)', 'Competidor B (challenger)', 'Competidor C (nicho)'],
      executive_summary: `${companyName || 'Esta empresa'} es una ${SIZES.find((s) => s.id === size)?.label.toLowerCase()} en el sector ${industry.toLowerCase()} en ${country}. Tiene fundamentos comerciales sólidos pero presenta oportunidades claras en marketing digital, principalmente en SEO, automation y presencia en LinkedIn. La madurez digital se estima en niveles intermedios. Es un perfil ideal para una propuesta integrada de growth con foco en quick-wins de los primeros 90 días.`,
    })
    setAnalyzing(false)
  }

  async function handleSave() {
    if (!companyName || !contactName) {
      console.warn('Nombre del contacto y empresa son requeridos')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: companyName,
        company: companyName,
        contact_name: contactName,
        contact_role: contactRole || null,
        email: contactEmail || null,
        contact_phone: contactPhone || null,
        industry: industry || null,
        company_size: size || null,
        website: website || null,
        instagram: instagram || null,
        facebook: facebook || null,
        linkedin: linkedin || null,
        tiktok: tiktok || null,
        metadata: {
          country: country || null,
          employees: employees || null,
          revenue: revenue || null,
          ai_analysis: null,
        },
      }

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        const msg = json?.error ?? `Error ${res.status}`
        console.error(`No se pudo guardar el cliente: ${msg}`)
        return
      }

      router.push('/clients')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Error inesperado: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  const canAnalyze = (website || instagram || linkedin || facebook || tiktok) && companyName

  return (
    <div className="max-w-4xl">
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo cliente</h1>
        <p className="text-sm text-gray-500 mt-1">Captura los datos del cliente y deja que la IA analice su presencia digital automáticamente.</p>
      </header>

      <div className="space-y-6">
        {/* Persona contacto */}
        <Card icon={<User className="h-4 w-4" />} title="Persona de contacto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre" required>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={CLIENT_LIMITS.contact_name} className={inputCls} placeholder="Ej: María García" />
            </Field>
            <Field label="Cargo" hint="El sistema sugerirá tono según el cargo">
              <input value={contactRole} onChange={(e) => setContactRole(e.target.value)} maxLength={CLIENT_LIMITS.contact_role} className={inputCls} placeholder="Ej: CEO, CFO, Marketing Manager" />
            </Field>
            <Field label="Email">
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={CLIENT_LIMITS.contact_email} className={inputCls} />
            </Field>
            <Field label="Celular">
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} maxLength={CLIENT_LIMITS.contact_phone} className={inputCls} placeholder="+56 9 1234 5678" />
            </Field>
          </div>
        </Card>

        {/* Empresa */}
        <Card icon={<Building2 className="h-4 w-4" />} title="Empresa">
          <Field label="Nombre de la empresa" required>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={CLIENT_LIMITS.company_name} className={inputCls} placeholder="Ej: TechFlow Solutions" />
          </Field>

          <Field label="Sitio web">
            <div className="flex">
              <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500"><Globe className="h-4 w-4" /></span>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={CLIENT_LIMITS.website} className={`${inputCls} rounded-l-none`} placeholder="https://" />
            </div>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="Instagram">
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500"><Instagram className="h-4 w-4" /></span>
                <input value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={CLIENT_LIMITS.social} className={`${inputCls} rounded-l-none`} placeholder="@usuario" />
              </div>
            </Field>
            <Field label="Facebook">
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500"><Facebook className="h-4 w-4" /></span>
                <input value={facebook} onChange={(e) => setFacebook(e.target.value)} maxLength={CLIENT_LIMITS.social} className={`${inputCls} rounded-l-none`} />
              </div>
            </Field>
            <Field label="LinkedIn">
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500"><Linkedin className="h-4 w-4" /></span>
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} maxLength={CLIENT_LIMITS.social} className={`${inputCls} rounded-l-none`} />
              </div>
            </Field>
            <Field label="TikTok">
              <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} maxLength={CLIENT_LIMITS.social} className={inputCls} placeholder="@usuario" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Field label="País">
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Industria">
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Tamaño">
              <select value={size} onChange={(e) => setSize(e.target.value)} className={inputCls}>
                {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.desc}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="N° empleados (opcional)">
              <input type="number" value={employees} onChange={(e) => setEmployees(e.target.value)} className={inputCls} placeholder="Ej: 45" />
            </Field>
            <Field label="Facturación anual estimada (opcional)">
              <input value={revenue} onChange={(e) => setRevenue(e.target.value)} className={inputCls} placeholder="Ej: USD $1.2M" />
            </Field>
          </div>
        </Card>

        {/* AI Analysis CTA */}
        <Card icon={<Sparkles className="h-4 w-4" />} title="Inteligencia automática" subtitle="Analizamos web + RRSS para generar contexto comercial accionable">
          {!analysis && !analyzing && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-600 mb-4">La IA analizará el cliente para detectar oportunidades, debilidades, tono comunicacional y generar un resumen ejecutivo accionable.</p>
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1D9E75] text-white font-semibold rounded-xl hover:bg-[#158a63] disabled:opacity-50 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Analizar empresa con IA
              </button>
              {!canAnalyze && <p className="text-xs text-gray-400 mt-2">Agrega web o RRSS + nombre empresa</p>}
            </div>
          )}

          {analyzing && (
            <div className="text-center py-8 space-y-3">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#1D9E75]/10">
                <Loader2 className="h-7 w-7 text-[#1D9E75] animate-spin" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Analizando {companyName}...</p>
              <div className="text-xs text-gray-500 space-y-1">
                <AnalysisStep done text="Scrapeando sitio web" />
                <AnalysisStep done text="Extrayendo datos de RRSS" />
                <AnalysisStep done={false} streaming text="Analizando con Claude AI" />
                <AnalysisStep done={false} text="Generando resumen ejecutivo" />
              </div>
            </div>
          )}

          {analysis && !analyzing && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Análisis completado</p>
                  <p className="text-sm text-gray-700">{analysis.executive_summary}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnalysisCard icon={<TrendingUp className="h-4 w-4" />} title="Modelo de negocio" body={analysis.business_model} />
                <AnalysisCard icon={<Target className="h-4 w-4" />} title="Propuesta de valor" body={analysis.value_prop} />
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Madurez digital</p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-[#1D9E75] rounded-full transition-all" style={{ width: `${analysis.digital_maturity}%` }} />
                </div>
                <p className="text-xs text-gray-500">{analysis.digital_maturity}% — {analysis.digital_maturity > 70 ? 'Alta' : analysis.digital_maturity > 40 ? 'Media' : 'Baja'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ListCard icon={<TrendingUp className="h-4 w-4 text-[#1D9E75]" />} title="Oportunidades detectadas" items={analysis.opportunities} />
                <ListCard icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} title="Debilidades visibles" items={analysis.weaknesses} />
              </div>

              <AnalysisCard icon={<MessageSquare className="h-4 w-4" />} title="Tono comunicacional" body={analysis.communication_tone} />

              <button onClick={handleAnalyze} className="text-xs text-gray-500 hover:text-[#1D9E75]">
                ↻ Re-analizar
              </button>
            </div>
          )}
        </Card>

        {/* Save */}
        <div className="sticky bottom-4 flex justify-end gap-2 pt-2">
          <Link href="/clients" className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl">Cancelar</Link>
          <button
            onClick={handleSave}
            disabled={saving || !companyName || !contactName}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1D9E75] text-white text-sm font-semibold rounded-xl shadow-lg hover:bg-[#158a63] disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75]'

function Card({ icon, title, subtitle, children }: { icon?: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        {icon && <div className="h-8 w-8 rounded-lg bg-[#e6f7f2] text-[#1D9E75] flex items-center justify-center flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function AnalysisStep({ done, streaming, text }: { done: boolean; streaming?: boolean; text: string }) {
  return (
    <p className="flex items-center gap-2 justify-center">
      {done ? <CheckCircle2 className="h-3 w-3 text-[#1D9E75]" /> : streaming ? <Loader2 className="h-3 w-3 text-[#1D9E75] animate-spin" /> : <span className="h-3 w-3 rounded-full border border-gray-300" />}
      <span className={done ? 'text-gray-500' : streaming ? 'text-gray-900 font-medium' : 'text-gray-400'}>{text}</span>
    </p>
  )
}

function AnalysisCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2 text-gray-700">
        <span className="text-[#1D9E75]">{icon}</span>
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <p className="text-sm text-gray-600">{body}</p>
    </div>
  )
}

function ListCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-xs font-semibold text-gray-700">{title}</p>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
            <span className="h-1 w-1 rounded-full bg-gray-400 flex-shrink-0 mt-2" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
