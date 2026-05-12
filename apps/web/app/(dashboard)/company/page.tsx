'use client'

import { useEffect, useState } from 'react'
import { Building2, Globe, Mail, Phone, Instagram, Facebook, Linkedin, Save, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { DEMO_COMPANY } from '@/lib/demo-v2'
import { DemoBanner } from '@/components/layout/DemoBanner'
import { FileUpload, type UploadedFile } from '@/components/ui/file-upload'
import { CountedTextarea } from '@/components/ui/counted-textarea'
import { isEmptyState } from '@/lib/demo-mode'

type CompanyData = typeof DEMO_COMPANY

// Field limits (synced with API)
export const COMPANY_LIMITS = {
  name: 200,
  website: 500,
  email: 200,
  phone: 50,
  what_we_do: 500,
  purpose: 500,
  ideal_clients: 500,
  differentiator: 200,
  social: 200,
} as const

const EMPTY_COMPANY: typeof DEMO_COMPANY = {
  ...DEMO_COMPANY,
  name: '',
  website: '',
  email: '',
  phone: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  tiktok: '',
  what_we_do: '',
  purpose: '',
  differentiators: [],
  ideal_clients: '',
  focus_industries: [],
  has_brand_manual: false,
  has_example_proposal: false,
  onboarding_completed: false,
}

const COUNTRIES = ['Chile', 'México', 'Colombia', 'Argentina', 'Perú', 'Otro']
const CURRENCIES = ['USD', 'CLP', 'MXN', 'COP', 'ARS', 'PEN'] as const
const ALL_INDUSTRIES = ['Tecnología', 'SaaS', 'Salud', 'Retail', 'Finanzas', 'Educación', 'Inmobiliario', 'Manufactura', 'Servicios profesionales', 'Logística', 'Alimentación', 'Otros']
const FONTS = ['Inter', 'Geist', 'Roboto', 'Poppins', 'Montserrat']

type Section = 'identity' | 'business' | 'branding' | 'assets'

export default function CompanyPage() {
  const [active, setActive] = useState<Section>('identity')
  const [data, setData] = useState(DEMO_COMPANY)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [diffInput, setDiffInput] = useState('')

  // Files
  const [logoFile, setLogoFile] = useState<UploadedFile | null>(null)
  const [brandManualFile, setBrandManualFile] = useState<UploadedFile | null>(null)
  const [exampleProposalFile, setExampleProposalFile] = useState<UploadedFile | null>(null)

  useEffect(() => {
    async function loadCompany() {
      try {
        const res = await fetch('/api/company')
        if (!res.ok) {
          // Fallback to empty or demo state if unauthenticated/no tenant yet
          if (isEmptyState()) setData(EMPTY_COMPANY)
          return
        }
        const json = await res.json() as { id: string; name: string; metadata: Record<string, unknown>; created_at: string }
        const meta = json.metadata ?? {}
        setData((prev) => ({
          ...prev,
          name: json.name ?? prev.name,
          website: (meta.website as string) ?? prev.website,
          email: (meta.email as string) ?? prev.email,
          phone: (meta.phone as string) ?? prev.phone,
          country: (meta.country as string) ?? prev.country,
          currency: (meta.currency as CompanyData['currency']) ?? prev.currency,
          instagram: (meta.instagram as string) ?? prev.instagram,
          facebook: (meta.facebook as string) ?? prev.facebook,
          linkedin: (meta.linkedin as string) ?? prev.linkedin,
          tiktok: (meta.tiktok as string) ?? prev.tiktok,
          what_we_do: (meta.what_we_do as string) ?? prev.what_we_do,
          purpose: (meta.purpose as string) ?? prev.purpose,
          ideal_clients: (meta.ideal_clients as string) ?? prev.ideal_clients,
          differentiators: (meta.differentiators as string[]) ?? prev.differentiators,
          focus_industries: (meta.focus_industries as string[]) ?? prev.focus_industries,
          logo_url: (meta.logo_url as string) ?? prev.logo_url,
          brand_manual_url: (meta.brand_manual_url as string) ?? prev.brand_manual_url,
          example_proposal_url: (meta.example_proposal_url as string) ?? prev.example_proposal_url,
          primary_color: (meta.primary_color as string) ?? prev.primary_color,
          secondary_color: (meta.secondary_color as string) ?? prev.secondary_color,
          accent_color: (meta.accent_color as string) ?? prev.accent_color,
          font_heading: (meta.font_heading as string) ?? prev.font_heading,
          font_body: (meta.font_body as string) ?? prev.font_body,
          has_brand_manual: (meta.has_brand_manual as boolean) ?? prev.has_brand_manual,
          has_example_proposal: (meta.has_example_proposal as boolean) ?? prev.has_example_proposal,
        }))
      } catch {
        if (isEmptyState()) setData(EMPTY_COMPANY)
      }
    }
    loadCompany()
  }, [])

  function update<K extends keyof typeof DEMO_COMPANY>(key: K, value: typeof DEMO_COMPANY[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  function toggleIndustry(ind: string) {
    const current = data.focus_industries ?? []
    update('focus_industries', current.includes(ind) ? current.filter((i) => i !== ind) : [...current, ind])
  }

  function addDifferentiator() {
    if (!diffInput.trim()) return
    update('differentiators', [...(data.differentiators ?? []), diffInput.trim()])
    setDiffInput('')
  }

  function removeDifferentiator(idx: number) {
    update('differentiators', (data.differentiators ?? []).filter((_, i) => i !== idx))
  }

  async function handleSave() {
    setSaved('saving')
    try {
      const res = await fetch('/api/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          metadata: {
            website: data.website,
            email: data.email,
            phone: data.phone,
            country: data.country,
            currency: data.currency,
            instagram: data.instagram,
            facebook: data.facebook,
            linkedin: data.linkedin,
            tiktok: data.tiktok,
            what_we_do: data.what_we_do,
            purpose: data.purpose,
            ideal_clients: data.ideal_clients,
            differentiators: data.differentiators,
            focus_industries: data.focus_industries,
            logo_url: logoFile?.url ?? data.logo_url,
            brand_manual_url: brandManualFile?.url ?? data.brand_manual_url,
            example_proposal_url: exampleProposalFile?.url ?? data.example_proposal_url,
            primary_color: data.primary_color,
            secondary_color: data.secondary_color,
            accent_color: data.accent_color,
            font_heading: data.font_heading,
            font_body: data.font_body,
            has_brand_manual: data.has_brand_manual,
            has_example_proposal: data.has_example_proposal,
          },
        }),
      })
      if (!res.ok) {
        console.error('[company/page] Save failed:', await res.text())
      }
      setSaved('saved')
    } catch (err) {
      console.error('[company/page] Save error:', err)
      setSaved('saved') // still show saved optimistically to avoid confusing UX
    }
    setTimeout(() => setSaved('idle'), 2000)
  }

  return (
    <div className="max-w-5xl">
      <DemoBanner message="Mi Empresa muestra datos de Andes Digital Studio (ejemplo)." />
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-[#1D9E75]" />
            Mi Empresa
          </h1>
          <p className="text-sm text-gray-500 mt-1">Perfil maestro de tu empresa proveedora — la base que el sistema usará para generar propuestas inteligentes.</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
          saved === 'saved' ? 'bg-green-50 text-green-700' :
          saved === 'saving' ? 'bg-blue-50 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {saved === 'saved' ? '✓ Guardado' : saved === 'saving' ? 'Guardando…' : 'Auto-guardado activo'}
        </span>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-50 p-1 rounded-xl border border-gray-100 w-fit">
        {[
          { id: 'identity', label: 'Identidad' },
          { id: 'business', label: 'Negocio' },
          { id: 'branding', label: 'Branding' },
          { id: 'assets', label: 'Activos comerciales' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id as Section)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              active === tab.id
                ? 'bg-white text-[#1D9E75] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Identity Section */}
      {active === 'identity' && (
        <div className="space-y-6">
          <Card title="Datos generales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre empresa" required>
                <input value={data.name} onChange={(e) => update('name', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Sitio web">
                <div className="flex"><span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm"><Globe className="h-4 w-4" /></span>
                  <input value={data.website ?? ''} onChange={(e) => update('website', e.target.value)} className={`${inputCls} rounded-l-none`} placeholder="https://..." />
                </div>
              </Field>
              <Field label="Email corporativo">
                <div className="flex"><span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm"><Mail className="h-4 w-4" /></span>
                  <input value={data.email ?? ''} onChange={(e) => update('email', e.target.value)} className={`${inputCls} rounded-l-none`} />
                </div>
              </Field>
              <Field label="Teléfono">
                <div className="flex"><span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm"><Phone className="h-4 w-4" /></span>
                  <input value={data.phone ?? ''} onChange={(e) => update('phone', e.target.value)} className={`${inputCls} rounded-l-none`} />
                </div>
              </Field>
              <Field label="País principal">
                <select value={data.country} onChange={(e) => update('country', e.target.value)} className={inputCls}>
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Moneda base">
                <select value={data.currency} onChange={(e) => update('currency', e.target.value as typeof CURRENCIES[number])} className={inputCls}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Redes sociales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Instagram">
                <div className="flex"><span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm"><Instagram className="h-4 w-4" /></span>
                  <input value={data.instagram ?? ''} onChange={(e) => update('instagram', e.target.value)} placeholder="@usuario" className={`${inputCls} rounded-l-none`} />
                </div>
              </Field>
              <Field label="Facebook">
                <div className="flex"><span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm"><Facebook className="h-4 w-4" /></span>
                  <input value={data.facebook ?? ''} onChange={(e) => update('facebook', e.target.value)} className={`${inputCls} rounded-l-none`} />
                </div>
              </Field>
              <Field label="LinkedIn">
                <div className="flex"><span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm"><Linkedin className="h-4 w-4" /></span>
                  <input value={data.linkedin ?? ''} onChange={(e) => update('linkedin', e.target.value)} className={`${inputCls} rounded-l-none`} />
                </div>
              </Field>
              <Field label="TikTok">
                <input value={data.tiktok ?? ''} onChange={(e) => update('tiktok', e.target.value)} placeholder="@usuario" className={inputCls} />
              </Field>
            </div>
          </Card>
        </div>
      )}

      {/* Business Section */}
      {active === 'business' && (
        <div className="space-y-6">
          <Card title="¿Qué hace tu empresa?">
            <Field label="Descripción">
              <CountedTextarea value={data.what_we_do ?? ''} onChange={(e) => update('what_we_do', e.target.value)} rows={3} maxLength={COMPANY_LIMITS.what_we_do} placeholder="Ej: Estudio digital especializado en growth para pymes B2B en LATAM..." />
            </Field>
            <Field label="Propósito / Misión">
              <CountedTextarea value={data.purpose ?? ''} onChange={(e) => update('purpose', e.target.value)} rows={3} maxLength={COMPANY_LIMITS.purpose} smart placeholder="Ej: Hacer que las marcas LATAM compitan con las grandes ligas digitales..." />
            </Field>
            <Field label="Tipo de cliente ideal">
              <CountedTextarea value={data.ideal_clients ?? ''} onChange={(e) => update('ideal_clients', e.target.value)} rows={3} maxLength={COMPANY_LIMITS.ideal_clients} smart placeholder="Ej: Pymes B2B con $500K+ de facturación anual..." />
            </Field>
          </Card>

          <Card title="Diferenciadores">
            <p className="text-xs text-gray-500 mb-3">¿Qué te hace único? Agrega hasta 5 diferenciadores que el sistema usará en cada propuesta.</p>
            <div className="space-y-2 mb-3">
              {(data.differentiators ?? []).map((d, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-[#e6f7f2] border border-[#1D9E75]/20 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-700">{d}</span>
                  <button onClick={() => removeDifferentiator(idx)} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            {(data.differentiators?.length ?? 0) < 5 && (
              <div>
                <div className="flex gap-2">
                  <input value={diffInput} onChange={(e) => setDiffInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDifferentiator()} maxLength={COMPANY_LIMITS.differentiator} placeholder="Ej: Equipo 100% LATAM" className={inputCls} />
                  <button onClick={addDifferentiator} className="inline-flex items-center gap-1 px-4 py-2 bg-[#1D9E75] text-white text-sm font-medium rounded-lg hover:bg-[#158a63]"><Plus className="h-4 w-4" /> Agregar</button>
                </div>
                <p className="text-xs text-gray-400 mt-1">{data.differentiators?.length ?? 0}/5 diferenciadores · máx {COMPANY_LIMITS.differentiator} chars c/u</p>
              </div>
            )}
          </Card>

          <Card title="Industrias foco">
            <p className="text-xs text-gray-500 mb-3">Selecciona las industrias donde te enfocas. El sistema optimizará propuestas según esto.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_INDUSTRIES.map((ind) => {
                const active = (data.focus_industries ?? []).includes(ind)
                return (
                  <button
                    key={ind}
                    onClick={() => toggleIndustry(ind)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      active
                        ? 'bg-[#1D9E75] text-white border-[#1D9E75]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {ind}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Branding Section */}
      {active === 'branding' && (
        <div className="space-y-6">
          <Card title="Logo">
            <FileUpload
              value={logoFile}
              onChange={setLogoFile}
              variant="image"
              hint="PNG, SVG, JPG · Mín 512x512 · Máx 5MB"
              accept="image/png,image/jpeg,image/svg+xml"
            />
          </Card>

          <Card title="Colores corporativos">
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'primary_color' as const, label: 'Color primario' },
                { key: 'secondary_color' as const, label: 'Color secundario' },
                { key: 'accent_color' as const, label: 'Color acento' },
              ].map(({ key, label }) => (
                <Field key={key} label={label}>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={data[key] ?? '#1D9E75'} onChange={(e) => update(key, e.target.value)} className="h-10 w-14 rounded border border-gray-200 cursor-pointer" />
                    <input type="text" value={data[key] ?? ''} onChange={(e) => update(key, e.target.value)} className={`${inputCls} font-mono text-sm`} />
                  </div>
                </Field>
              ))}
            </div>
          </Card>

          <Card title="Tipografías">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipografía títulos">
                <select value={data.font_heading ?? 'Inter'} onChange={(e) => update('font_heading', e.target.value)} className={inputCls}>
                  {FONTS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Tipografía cuerpo">
                <select value={data.font_body ?? 'Inter'} onChange={(e) => update('font_body', e.target.value)} className={inputCls}>
                  {FONTS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Manual de marca y propuesta ejemplo">
            <div className="space-y-4">
              {/* Manual de marca */}
              <div>
                <ToggleRow label="Tengo manual de marca" enabled={data.has_brand_manual} onChange={(v) => update('has_brand_manual', v)} hint={!data.has_brand_manual ? 'Crearemos identidad visual base profesional automáticamente' : 'Sube tu manual PDF para mantener consistencia'} />
                {data.has_brand_manual && (
                  <div className="mt-3 pl-4 border-l-2 border-[#1D9E75]/30">
                    <FileUpload
                      value={brandManualFile}
                      onChange={setBrandManualFile}
                      variant="pdf"
                      hint="PDF — Manual de marca · Máx 10MB"
                      label="Sube tu manual de marca"
                    />
                  </div>
                )}
              </div>

              {/* Propuesta ejemplo */}
              <div>
                <ToggleRow label="Tengo propuesta ejemplo" enabled={data.has_example_proposal} onChange={(v) => update('has_example_proposal', v)} hint={!data.has_example_proposal ? 'Crearemos un template profesional automáticamente' : 'Sube tu propuesta ejemplo para clonar el estilo'} />
                {data.has_example_proposal && (
                  <div className="mt-3 pl-4 border-l-2 border-[#1D9E75]/30">
                    <FileUpload
                      value={exampleProposalFile}
                      onChange={setExampleProposalFile}
                      variant="pdf"
                      hint="PDF o PPTX — Propuesta ejemplo · Máx 10MB"
                      label="Sube tu propuesta ejemplo"
                      accept="application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Assets Section */}
      {active === 'assets' && (
        <div className="space-y-6">
          <Card title="Casos de éxito">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Configura tus casos de éxito para usarlos automáticamente en propuestas</p>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">0 casos</span>
            </div>
            <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50">
              <Plus className="h-4 w-4" /> Agregar caso de éxito
            </button>
          </Card>

          <Card title="Testimonios">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Quotes de clientes para construir credibilidad</p>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">0 testimonios</span>
            </div>
            <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50">
              <Plus className="h-4 w-4" /> Agregar testimonio
            </button>
          </Card>

          <Card title="Logos de clientes" subtitle="Logos para mostrar en social proof (próximamente)">
            <FileUpload
              value={null}
              onChange={() => {}}
              variant="image"
              compact
              hint="PNG, SVG · máx 5MB cada uno"
            />
            <p className="text-xs text-gray-400 mt-2">Múltiples logos disponibles próximamente</p>
          </Card>

          <Card title="Certificaciones y FAQ comerciales">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">Sección disponible próximamente — la generación automática de propuestas ya considera placeholders.</p>
            </div>
          </Card>
        </div>
      )}

      {/* Sticky save footer */}
      <div className="sticky bottom-4 mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saved === 'saving'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1D9E75] text-white font-semibold rounded-xl hover:bg-[#158a63] shadow-lg disabled:opacity-60 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saved === 'saving' ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] transition-colors'

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-4'}>{children}</div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function ToggleRow({ label, enabled, onChange, hint }: { label: string; enabled: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-[#1D9E75]' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}
