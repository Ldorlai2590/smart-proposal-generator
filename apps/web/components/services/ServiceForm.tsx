'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, X, Save } from 'lucide-react'
import type { Service, BillingType } from '@/lib/types/service'
import { CountedTextarea } from '@/components/ui/counted-textarea'

// Service field limits (synced with API Zod)
export const SERVICE_LIMITS = {
  name: 200,
  description: 1000,
  objective: 500,
  scope: 1000,
  duration_estimate: 100,
  chip: 200,            // each item in includes/excludes/deliverables
  base_price_max: 9_999_999,
} as const

const CATEGORIES = ['Marketing Digital', 'Diseño', 'Desarrollo', 'Estrategia', 'Branding', 'Contenido', 'Social Media', 'Otros']
const BILLING_OPTIONS: { value: BillingType; label: string }[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'one_time', label: 'Único' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'project', label: 'Por proyecto' },
]
const CURRENCIES = ['USD', 'CLP', 'MXN', 'COP', 'ARS', 'PEN']

export function ServiceForm({ initial }: { initial?: Partial<Service> }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0])
  const [description, setDescription] = useState(initial?.description ?? '')
  const [objective, setObjective] = useState(initial?.objective ?? '')
  const [scope, setScope] = useState(initial?.scope ?? '')
  const [includes, setIncludes] = useState<string[]>(initial?.includes ?? [])
  const [excludes, setExcludes] = useState<string[]>(initial?.excludes ?? [])
  const [duration, setDuration] = useState(initial?.duration_estimate ?? '')
  const [deliverables, setDeliverables] = useState<string[]>(initial?.deliverables ?? [])
  const [basePrice, setBasePrice] = useState(initial?.base_price ?? 1500)
  const [currency, setCurrency] = useState(initial?.currency ?? 'USD')
  const [customizable, setCustomizable] = useState(initial?.customizable ?? true)
  const [billing, setBilling] = useState<BillingType>(initial?.billing_type ?? 'monthly')
  const [margin, setMargin] = useState(initial?.desired_margin ?? 35)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    alert('Servicio guardado (demo). En producción se persiste en Supabase.')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      <Card title="Información básica">
        <Field label="Nombre del servicio" required hint={`Máx ${SERVICE_LIMITS.name} caracteres`}>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={SERVICE_LIMITS.name} className={inputCls} />
        </Field>
        <Field label="Categoría">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Descripción comercial" hint="Cómo se vende este servicio en pocas líneas">
          <CountedTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={SERVICE_LIMITS.description} placeholder="Ej: Gestión completa de campañas pagadas en Google y Meta con optimización semanal" />
        </Field>
        <Field label="Objetivo del servicio">
          <CountedTextarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} maxLength={SERVICE_LIMITS.objective} smart placeholder="¿Qué resultado entrega al cliente?" />
        </Field>
        <Field label="Alcance del servicio">
          <CountedTextarea value={scope} onChange={(e) => setScope(e.target.value)} rows={3} maxLength={SERVICE_LIMITS.scope} smart placeholder="Resumen del alcance del servicio, hitos clave, entregables principales..." />
        </Field>
      </Card>

      <Card title="Qué incluye / qué no incluye">
        <Field label="¿Qué incluye?">
          <ChipInput items={includes} onChange={setIncludes} placeholder="Ej: 15 anuncios mensuales" />
        </Field>
        <Field label="¿Qué NO incluye?">
          <ChipInput items={excludes} onChange={setExcludes} placeholder="Ej: Presupuesto de medios" />
        </Field>
      </Card>

      <Card title="Tiempo y entregables">
        <Field label="Tiempo estimado">
          <input value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={SERVICE_LIMITS.duration_estimate} placeholder="Ej: 3 semanas, mensual recurrente" className={inputCls} />
        </Field>
        <Field label="Entregables concretos">
          <ChipInput items={deliverables} onChange={setDeliverables} placeholder="Ej: Reporte mensual" />
        </Field>
      </Card>

      <Card title="Precio y facturación">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Precio base">
            <div className="flex">
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="px-2 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-600">
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input type="number" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} min="0" className={`${inputCls} rounded-l-none`} />
            </div>
          </Field>
          <Field label="Tipo de facturación">
            <select value={billing} onChange={(e) => setBilling(e.target.value as BillingType)} className={inputCls}>
              {BILLING_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mt-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Precio personalizable</p>
            <p className="text-xs text-gray-500">El equipo podrá ajustar el precio al crear propuesta</p>
          </div>
          <button type="button" onClick={() => setCustomizable(!customizable)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${customizable ? 'bg-[#1D9E75]' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${customizable ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <Field label={`Margen deseado: ${margin}%`} hint="Opcional — sirve para calcular precio mínimo aceptable">
          <input type="range" min="0" max="100" value={margin} onChange={(e) => setMargin(Number(e.target.value))} className="w-full accent-[#1D9E75]" />
        </Field>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed bottom-4 left-0 right-0 md:left-60 px-4 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-end gap-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          <Link href="/services" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</Link>
          <button type="submit" disabled={saving || !name} className="inline-flex items-center gap-2 px-5 py-2 bg-[#1D9E75] text-white text-sm font-semibold rounded-lg hover:bg-[#158a63] disabled:opacity-60 transition-colors">
            <Save className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Guardar servicio'}
          </button>
        </div>
      </div>
    </form>
  )
}

const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75]'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">{title}</h2>
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

function ChipInput({ items, onChange, placeholder, maxItemLength = SERVICE_LIMITS.chip, maxItems = 30 }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; maxItemLength?: number; maxItems?: number }) {
  const [input, setInput] = useState('')
  const reachedMax = items.length >= maxItems

  function add() {
    if (!input.trim()) return
    if (reachedMax) return
    onChange([...items, input.trim().slice(0, maxItemLength)])
    setInput('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, idx) => (
          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e6f7f2] text-[#1D9E75] text-xs font-medium rounded-full max-w-full">
            <span className="truncate">{item}</span>
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== idx))} className="hover:text-red-500 flex-shrink-0"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={reachedMax ? `Máximo ${maxItems} items` : placeholder}
          maxLength={maxItemLength}
          disabled={reachedMax}
          className={inputCls + (reachedMax ? ' opacity-50' : '')}
        />
        <button type="button" onClick={add} disabled={reachedMax || !input.trim()} className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">{items.length}/{maxItems} items · {maxItemLength} chars c/u</p>
    </div>
  )
}
