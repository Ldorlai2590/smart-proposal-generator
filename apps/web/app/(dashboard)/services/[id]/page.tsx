'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Edit2, Tag, Clock, CheckCircle2, XCircle, Package, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface ServiceDetail {
  id: string
  name: string
  category: string
  description: string
  objective?: string
  scope?: string
  includes: string[]
  excludes: string[]
  duration_estimate?: string
  deliverables: string[]
  base_price: number
  billing_type: string
}

const BILLING_LABELS: Record<string, string> = {
  monthly: 'Mensual recurrente',
  one_time: 'Pago único',
  quarterly: 'Trimestral',
  project: 'Por proyecto',
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/services/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: ServiceDetail) => {
        if (!cancelled) setService(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-[#1D9E75] animate-spin" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="max-w-4xl">
        <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-500">
          Servicio no encontrado.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>

      <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full mb-3">
              <Tag className="h-3 w-3" />
              {service.category}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{service.name}</h1>
            <p className="text-gray-600">{service.description}</p>
          </div>
          <Link href={`/services/${id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50">
            <Edit2 className="h-4 w-4" /> Editar
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 mt-6 border-t border-gray-100">
          <Stat label="Precio base" value={formatCurrency(service.base_price, 'USD')} />
          <Stat label="Facturación" value={BILLING_LABELS[service.billing_type] ?? service.billing_type} />
          <Stat label="Duración" value={service.duration_estimate ?? '—'} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card title="¿Qué incluye?" icon={<CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />}>
          <ul className="space-y-2">
            {service.includes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-[#1D9E75] flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="¿Qué NO incluye?" icon={<XCircle className="h-4 w-4 text-red-500" />}>
          <ul className="space-y-2">
            {service.excludes.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {service.objective && (
        <Card title="Objetivo" icon={<Package className="h-4 w-4 text-[#1D9E75]" />}>
          <p className="text-sm text-gray-700">{service.objective}</p>
        </Card>
      )}

      {service.scope && (
        <div className="mt-4">
          <Card title="Alcance" icon={<Clock className="h-4 w-4 text-[#1D9E75]" />}>
            <p className="text-sm text-gray-700">{service.scope}</p>
          </Card>
        </div>
      )}

      <div className="mt-4">
        <Card title="Entregables">
          <div className="flex flex-wrap gap-2">
            {service.deliverables.map((d, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                {d}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  )
}
