'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ServiceForm } from '@/components/services/ServiceForm'

export default function NewServicePage() {
  return (
    <div className="max-w-3xl">
      <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver al catálogo
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Nuevo servicio</h1>
      <p className="text-sm text-gray-500 mb-6">Define un servicio reutilizable que aparecerá al crear propuestas.</p>
      <ServiceForm />
    </div>
  )
}
