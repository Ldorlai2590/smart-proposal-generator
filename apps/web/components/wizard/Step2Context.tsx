'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Briefcase, Package, Target, Palette, Award, ChevronDown, Check, Plus, X, AlertCircle, Calendar } from 'lucide-react'
import type { ClientData } from './Step1Client'
import { DEMO_SERVICES } from '@/lib/demo-v2'
import { formatCurrency } from '@/lib/format'
import type { BillingType } from '@/lib/types/service'

export interface SelectedService {
  service_id: string
  name: string
  base_price: number
  adjusted_price: number
  quantity: number
  discount_percent: number
  billing_type: BillingType
}

export interface ContextData {
  // Block 1
  problema: string
  objectives: string
  current_problems: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  budget: string
  start_date: string
  // Block 2
  services: SelectedService[]
  // Block 3
  formality: 'ejecutivo' | 'cercano' | 'premium' | 'tecnico'
  tono: 'formal' | 'consultivo' | 'directo'
  // Block 4
  design_template: 'minimalista' | 'premium' | 'corporativo' | 'creativo'
  use_existing: boolean
  // Block 5
  selected_cases: string[]
}

interface Step2ContextProps {
  client: ClientData
  onNext: (data: ContextData) => void
  onBack: () => void
}

const URGENCY_OPTIONS = [
  { id: 'low' as const, label: 'Baja', desc: 'Sin presión de tiempo', color: 'bg-gray-50 text-gray-700' },
  { id: 'medium' as const, label: 'Media', desc: 'Próximos 3 meses', color: 'bg-blue-50 text-blue-700' },
  { id: 'high' as const, label: 'Alta', desc: 'Próximas 4 semanas', color: 'bg-amber-50 text-amber-700' },
  { id: 'critical' as const, label: 'Crítica', desc: 'Esta semana', color: 'bg-red-50 text-red-700' },
]

const BUDGETS = ['< $5K', '$5K - $20K', '$20K - $50K', '$50K - $100K', '$100K+']

const FORMALITY_OPTIONS = [
  { id: 'ejecutivo' as const, label: 'Ejecutivo', desc: 'Para C-level y board' },
  { id: 'cercano' as const, label: 'Cercano', desc: 'Tono conversacional' },
  { id: 'premium' as const, label: 'Premium', desc: 'Lujo, exclusividad' },
  { id: 'tecnico' as const, label: 'Técnico', desc: 'Detalle técnico profundo' },
]

const DESIGN_OPTIONS = [
  { id: 'minimalista' as const, label: 'Minimalista', icon: '◯', desc: 'Limpio, mucho whitespace' },
  { id: 'premium' as const, label: 'Premium', icon: '✦', desc: 'Tipografías serif, oro/dark' },
  { id: 'corporativo' as const, label: 'Corporativo', icon: '▪', desc: 'Azul, estructurado, formal' },
  { id: 'creativo' as const, label: 'Creativo', icon: '✺', desc: 'Color, ilustraciones, moderno' },
]

// Tono auto-suggested por cargo
const ROLE_TONE_MAP: Record<string, { tono: 'formal' | 'consultivo' | 'directo'; reasoning: string }> = {
  ceo: { tono: 'consultivo', reasoning: 'CEO valora visión estratégica y resultados' },
  cfo: { tono: 'formal', reasoning: 'CFO necesita ROI claro y control financiero' },
  cmo: { tono: 'directo', reasoning: 'Marketing prefiere métricas de crecimiento' },
  rrhh: { tono: 'consultivo', reasoning: 'RRHH valora procesos y personas' },
  cto: { tono: 'directo', reasoning: 'CTO quiere detalle técnico claro' },
}

const DEMO_CASES = [
  { id: 'case-1', title: 'Triplicamos leads de TechFlow Solutions en 90 días', industry: 'Tecnología', match: 95 },
  { id: 'case-2', title: 'Retail Plus: -28% CAC con paid media optimizado', industry: 'Retail', match: 88 },
  { id: 'case-3', title: 'FoodTech: nuevo branding + 40% engagement', industry: 'Alimentación', match: 72 },
  { id: 'case-4', title: 'Innova Labs: estrategia content que generó $1.2M ARR', industry: 'SaaS', match: 91 },
]

export function Step2Context({ client, onNext, onBack }: Step2ContextProps) {
  // Block 1
  const [problema, setProblema] = useState('')
  const [objectives, setObjectives] = useState('')
  const [currentProblems, setCurrentProblems] = useState('')
  const [urgency, setUrgency] = useState<ContextData['urgency']>('medium')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')

  // Block 2
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])

  // Block 3
  const [formality, setFormality] = useState<ContextData['formality']>('ejecutivo')
  const detectedRole = useMemo(() => {
    const role = (client.contact_role ?? '').toLowerCase()
    if (role.includes('ceo')) return 'ceo'
    if (role.includes('cfo') || role.includes('finanz')) return 'cfo'
    if (role.includes('marketing') || role.includes('cmo')) return 'cmo'
    if (role.includes('rrhh') || role.includes('hr') || role.includes('personas')) return 'rrhh'
    if (role.includes('cto') || role.includes('tech')) return 'cto'
    return null
  }, [client.contact_role])

  const suggestedTone = detectedRole ? ROLE_TONE_MAP[detectedRole] : null
  const [tono, setTono] = useState<ContextData['tono']>(suggestedTone?.tono ?? 'consultivo')

  // Block 4
  const [designTemplate, setDesignTemplate] = useState<ContextData['design_template']>('minimalista')
  const [useExisting, setUseExisting] = useState(false)

  // Block 5
  const [selectedCases, setSelectedCases] = useState<string[]>([DEMO_CASES[0].id])

  // Service handlers
  function addService(svcId: string) {
    const s = DEMO_SERVICES.find((d) => d.id === svcId)
    if (!s) return
    if (selectedServices.find((sel) => sel.service_id === svcId)) return
    setSelectedServices([
      ...selectedServices,
      {
        service_id: s.id,
        name: s.name,
        base_price: s.base_price,
        adjusted_price: s.base_price,
        quantity: 1,
        discount_percent: 0,
        billing_type: s.billing_type,
      },
    ])
  }

  function removeService(svcId: string) {
    setSelectedServices(selectedServices.filter((s) => s.service_id !== svcId))
  }

  function updateService(svcId: string, patch: Partial<SelectedService>) {
    setSelectedServices(selectedServices.map((s) => (s.service_id === svcId ? { ...s, ...patch } : s)))
  }

  const totalInvestment = useMemo(() => {
    return selectedServices.reduce((sum, s) => {
      const subtotal = s.adjusted_price * s.quantity
      const discount = subtotal * (s.discount_percent / 100)
      return sum + (subtotal - discount)
    }, 0)
  }, [selectedServices])

  const canContinue = problema.trim().length >= 20 && selectedServices.length > 0

  function handleSubmit() {
    onNext({
      problema,
      objectives,
      current_problems: currentProblems,
      urgency,
      budget,
      start_date: startDate,
      services: selectedServices,
      formality,
      tono,
      design_template: designTemplate,
      use_existing: useExisting,
      selected_cases: selectedCases,
    })
  }

  return (
    <div className="space-y-4">
      {/* Block 1: Contexto comercial */}
      <Block icon={<Briefcase className="h-4 w-4" />} title="1 · Contexto comercial" subtitle="¿Qué necesita el cliente y bajo qué condiciones?" defaultOpen>
        <div className="space-y-4">
          <Field label="¿Qué necesita el cliente? *" required>
            <Textarea
              placeholder={`¿Cuál es el principal desafío de ${client.company} que quieres abordar?`}
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              className="min-h-[80px]"
            />
            <p className={cn('text-xs text-right mt-1', problema.length < 20 ? 'text-gray-400' : 'text-[#1D9E75]')}>
              {problema.length} / 20 mín
            </p>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Objetivos principales">
              <Textarea
                placeholder="Ej: Aumentar leads 3x en 6 meses"
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                className="min-h-[60px]"
              />
            </Field>
            <Field label="Problemas actuales detectados">
              <Textarea
                placeholder="Ej: CAC alto, baja conversión..."
                value={currentProblems}
                onChange={(e) => setCurrentProblems(e.target.value)}
                className="min-h-[60px]"
              />
            </Field>
          </div>

          <Field label="Urgencia">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {URGENCY_OPTIONS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgency(u.id)}
                  className={cn(
                    'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all',
                    urgency === u.id ? `border-[#1D9E75] ${u.color}` : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <span className="text-sm font-semibold">{u.label}</span>
                  <span className="text-xs text-gray-500">{u.desc}</span>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Presupuesto estimado">
              <div className="flex flex-wrap gap-1.5">
                {BUDGETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBudget(budget === b ? '' : b)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                      budget === b ? 'bg-[#1D9E75] text-white border-[#1D9E75]' : 'border-gray-200 text-gray-600 hover:border-[#1D9E75]',
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Fecha esperada de inicio">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
                />
              </div>
            </Field>
          </div>
        </div>
      </Block>

      {/* Block 2: Servicios desde catálogo */}
      <Block icon={<Package className="h-4 w-4" />} title="2 · Servicios a incluir" subtitle={`Desde tu catálogo · ${selectedServices.length} seleccionado(s)`} defaultOpen>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Selecciona servicios de tu catálogo. Puedes ajustar precio, cantidad y descuento por propuesta.</p>

          {/* Add service combobox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {DEMO_SERVICES.filter((s) => !selectedServices.find((sel) => sel.service_id === s.id)).slice(0, 6).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addService(s.id)}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-left hover:border-[#1D9E75] hover:bg-[#1D9E75]/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(s.base_price, 'USD')}</p>
                </div>
                <Plus className="h-4 w-4 text-[#1D9E75] flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Selected services */}
          {selectedServices.length > 0 && (
            <div className="space-y-2 pt-2">
              {selectedServices.map((s) => (
                <div key={s.service_id} className="bg-[#e6f7f2] border border-[#1D9E75]/20 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 flex-1">{s.name}</p>
                    <button type="button" onClick={() => removeService(s.service_id)} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-gray-500">Cantidad</label>
                      <input
                        type="number"
                        value={s.quantity}
                        min={1}
                        onChange={(e) => updateService(s.service_id, { quantity: Math.max(1, Number(e.target.value)) })}
                        className="w-full px-2 py-1 mt-0.5 border border-gray-200 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">Precio (USD)</label>
                      <input
                        type="number"
                        value={s.adjusted_price}
                        onChange={(e) => updateService(s.service_id, { adjusted_price: Number(e.target.value) })}
                        className="w-full px-2 py-1 mt-0.5 border border-gray-200 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">Descuento %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={s.discount_percent}
                        onChange={(e) => updateService(s.service_id, { discount_percent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                        className="w-full px-2 py-1 mt-0.5 border border-gray-200 rounded bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 font-medium">
                    Subtotal: {formatCurrency(s.adjusted_price * s.quantity * (1 - s.discount_percent / 100), 'USD')}
                    <span className="text-gray-400 ml-2">({s.billing_type === 'monthly' ? '/mes' : s.billing_type === 'one_time' ? 'único' : s.billing_type})</span>
                  </p>
                </div>
              ))}
              <div className="flex justify-between items-center p-3 bg-[#1D9E75] text-white rounded-xl">
                <span className="text-sm font-medium">Inversión total estimada</span>
                <span className="text-lg font-bold">{formatCurrency(totalInvestment, 'USD')}</span>
              </div>
            </div>
          )}
        </div>
      </Block>

      {/* Block 3: Enfoque estratégico */}
      <Block icon={<Target className="h-4 w-4" />} title="3 · Enfoque estratégico" subtitle="Tono y formalidad ajustado al contacto">
        <div className="space-y-4">
          {suggestedTone && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium">Tono sugerido para {client.contact_role ?? 'el contacto'}: <span className="font-bold">{suggestedTone.tono}</span></p>
                <p className="text-xs text-blue-700 mt-0.5">{suggestedTone.reasoning}</p>
              </div>
            </div>
          )}

          <Field label="Nivel de formalidad">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FORMALITY_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormality(f.id)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    formality === f.id ? 'border-[#1D9E75] bg-[#1D9E75]/5' : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tono">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'consultivo' as const, label: 'Consultivo' },
                { id: 'formal' as const, label: 'Formal' },
                { id: 'directo' as const, label: 'Directo' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTono(t.id)}
                  className={cn(
                    'py-2 rounded-lg border text-sm transition-colors',
                    tono === t.id ? 'border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75] font-semibold' : 'border-gray-200 text-gray-600',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Block>

      {/* Block 4: Diseño */}
      <Block icon={<Palette className="h-4 w-4" />} title="4 · Diseño visual" subtitle={`Estilo ${designTemplate}`}>
        <div className="space-y-4">
          <Field label="Estilo del documento">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DESIGN_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDesignTemplate(d.id)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    designTemplate === d.id ? 'border-[#1D9E75] bg-[#1D9E75]/5' : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <span className="text-2xl block mb-1">{d.icon}</span>
                  <p className="text-sm font-semibold text-gray-900">{d.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Usar template existente</p>
              <p className="text-xs text-gray-500 mt-0.5">Reutiliza el último template guardado en tu empresa</p>
            </div>
            <button
              type="button"
              onClick={() => setUseExisting(!useExisting)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
                useExisting ? 'bg-[#1D9E75]' : 'bg-gray-300',
              )}
            >
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', useExisting ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        </div>
      </Block>

      {/* Block 5: Casos de éxito sugeridos */}
      <Block icon={<Award className="h-4 w-4" />} title="5 · Casos de éxito a incluir" subtitle={`${selectedCases.length} seleccionado(s) · sugeridos por similitud`}>
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">El sistema sugiere casos por industria, problema y país. Selecciona los que más resuenen.</p>
          {DEMO_CASES.map((c) => {
            const sel = selectedCases.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCases(sel ? selectedCases.filter((id) => id !== c.id) : [...selectedCases, c.id])}
                className={cn(
                  'w-full flex items-center gap-3 p-3 border rounded-xl text-left transition-colors',
                  sel ? 'border-[#1D9E75] bg-[#1D9E75]/5' : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <div className={cn('h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0', sel ? 'bg-[#1D9E75]' : 'border-2 border-gray-300')}>
                  {sel && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-500">Industria: {c.industry}</p>
                </div>
                <span className="text-xs font-bold text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-1 rounded-full">{c.match}% match</span>
              </button>
            )
          })}
        </div>
      </Block>

      {/* Footer actions */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-gray-100 -mx-8 px-8">
        <Button variant="outline" onClick={onBack} size="lg">
          Atrás
        </Button>
        <Button onClick={handleSubmit} disabled={!canContinue} size="lg" className="flex-1">
          {canContinue ? 'Generar propuesta con IA →' : 'Completa los campos requeridos'}
        </Button>
      </div>
    </div>
  )
}

function Block({ icon, title, subtitle, children, defaultOpen = false }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
        <div className="h-8 w-8 rounded-lg bg-[#e6f7f2] text-[#1D9E75] flex items-center justify-center flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4 pt-2 border-t border-gray-100">{children}</div>}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
