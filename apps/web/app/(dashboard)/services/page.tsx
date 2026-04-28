'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Search, Package, Clock, Edit2, Trash2, Eye, Tag } from 'lucide-react'
import { DEMO_SERVICES } from '@/lib/demo-v2'
import { formatCurrency } from '@/lib/format'
import type { Service, BillingType } from '@/lib/types/service'

const CATEGORIES = ['Todas', ...Array.from(new Set(DEMO_SERVICES.map((s) => s.category)))]
const BILLING_TYPES: { value: BillingType | 'all'; label: string }[] = [
  { value: 'all', label: 'Toda facturación' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'one_time', label: 'Único' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'project', label: 'Por proyecto' },
]

const BILLING_LABELS: Record<BillingType, string> = {
  monthly: '/mes',
  one_time: 'único',
  quarterly: '/trim',
  project: 'proyecto',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Marketing Digital': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'Diseño': { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Desarrollo': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Estrategia': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Branding': { bg: 'bg-pink-50', text: 'text-pink-700' },
  'Social Media': { bg: 'bg-cyan-50', text: 'text-cyan-700' },
}

export default function ServicesPage() {
  const [services] = useState<Service[]>(DEMO_SERVICES)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [billing, setBilling] = useState<BillingType | 'all'>('all')

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (query && !s.name.toLowerCase().includes(query.toLowerCase()) && !s.description.toLowerCase().includes(query.toLowerCase())) return false
      if (category !== 'Todas' && s.category !== category) return false
      if (billing !== 'all' && s.billing_type !== billing) return false
      return true
    })
  }, [services, query, category, billing])

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-[#1D9E75]" />
            Catálogo de servicios
          </h1>
          <p className="text-sm text-gray-500 mt-1">Estos servicios aparecerán automáticamente como opciones al crear nuevas propuestas.</p>
        </div>
        <Link
          href="/services/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1D9E75] text-white text-sm font-semibold rounded-xl hover:bg-[#158a63] transition-colors flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nuevo servicio
        </Link>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar servicios..."
            className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75]"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={billing} onChange={(e) => setBilling(e.target.value as BillingType | 'all')} className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40">
          {BILLING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatPill label="Total servicios" value={services.length} />
        <StatPill label="Activos" value={services.filter((s) => s.active).length} />
        <StatPill label="Recurrentes" value={services.filter((s) => s.billing_type === 'monthly' || s.billing_type === 'quarterly').length} />
        <StatPill label="Categorías" value={new Set(services.map((s) => s.category)).size} />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No se encontraron servicios</p>
          <p className="text-sm text-gray-400 mt-1">Ajusta los filtros o crea un nuevo servicio</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}

function ServiceCard({ service }: { service: Service }) {
  const cat = CATEGORY_COLORS[service.category] ?? { bg: 'bg-gray-50', text: 'text-gray-700' }

  return (
    <div className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#1D9E75]/30 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center gap-1 ${cat.bg} ${cat.text} text-[11px] font-medium px-2 py-1 rounded-full`}>
          <Tag className="h-3 w-3" />
          {service.category}
        </span>
        {service.customizable && (
          <span className="text-[10px] text-[#1D9E75] font-medium">Personalizable</span>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{service.name}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[40px]">{service.description}</p>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(service.base_price, 'USD')}</p>
          <p className="text-xs text-gray-400">{BILLING_LABELS[service.billing_type]}</p>
        </div>
        {service.duration_estimate && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            {service.duration_estimate}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
        <Link href={`/services/${service.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-[#1D9E75] hover:bg-gray-50 rounded-lg transition-colors">
          <Eye className="h-3.5 w-3.5" /> Ver
        </Link>
        <Link href={`/services/${service.id}/edit`} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-[#1D9E75] hover:bg-gray-50 rounded-lg transition-colors">
          <Edit2 className="h-3.5 w-3.5" /> Editar
        </Link>
        <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </button>
      </div>
    </div>
  )
}
