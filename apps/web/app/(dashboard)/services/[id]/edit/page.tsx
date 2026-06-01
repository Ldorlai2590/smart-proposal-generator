'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ServiceForm } from '@/components/services/ServiceForm'
import type { Service } from '@/lib/types/service'

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [service, setService] = useState<Service | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/services/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Service>
      })
      .then(setService)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [id])

  return (
    <div className="max-w-3xl">
      <Link href={`/services/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver al servicio
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Editar servicio</h1>
      <p className="text-sm text-gray-500 mb-6">Actualiza los detalles del servicio.</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          No se pudo cargar el servicio: {error}
        </div>
      )}

      {!service && !error && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Cargando…
        </div>
      )}

      {service && <ServiceForm initial={service} />}
    </div>
  )
}
