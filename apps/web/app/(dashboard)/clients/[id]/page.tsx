'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Mail,
  Users,
  TrendingUp,
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  Send,
  Edit3,
  ChevronRight,
} from 'lucide-react'


interface Proposal {
  id: string
  title: string
  status: string
  created_at: string
  value: number
}

interface ClientDetail {
  id: string
  name: string
  company: string | null
  email: string | null
  industry: string | null
  company_size: string | null
  score: number
  created_at: string
  proposals: Proposal[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  accepted: { label: 'Aceptada', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  sent: { label: 'Enviada', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Send },
  draft: { label: 'Borrador', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', icon: Edit3 },
  rejected: { label: 'Rechazada', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: Clock },
}

function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 80 ? '#1D9E75' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F97316' : '#EF4444'

  return (
    <div className="relative h-28 w-28 flex-shrink-0">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Score</span>
      </div>
    </div>
  )
}

export default function ClientDetailPage() {
  
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    fetch(`/api/clients/${clientId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((data) => setClient(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [clientId])


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-3 w-32 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl border border-gray-100 bg-white p-6 h-64 animate-pulse" />
          <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Cliente no encontrado</h3>
        <p className="text-sm text-gray-500 max-w-xs mb-4">
          El cliente que buscas no existe o no tienes acceso.
        </p>
        <button
          onClick={() => router.push('/clients')}
          className="text-sm text-[#1D9E75] font-medium hover:underline"
        >
          Volver a clientes
        </button>
      </div>
    )
  }

  const totalValue = client.proposals.reduce((sum, p) => sum + p.value, 0)
  const acceptedCount = client.proposals.filter((p) => p.status === 'accepted').length
  const acceptedValue = client.proposals.filter((p) => p.status === 'accepted').reduce((sum, p) => sum + p.value, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/clients')}
            className="h-9 w-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm text-gray-500">{client.company ?? 'Sin empresa'}</span>
            </div>
          </div>
        </div>
        <Link
          href={`/proposals/new?client=${client.id}`}
          className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Crear propuesta
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Client info + Score */}
        <div className="lg:col-span-1 space-y-6">
          {/* Score card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Score de oportunidad</h2>
            <div className="flex justify-center mb-4">
              <ScoreRing score={client.score} />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {client.score >= 80
                  ? 'Alta probabilidad de cierre'
                  : client.score >= 60
                    ? 'Buenas perspectivas'
                    : client.score >= 40
                      ? 'Requiere seguimiento'
                      : 'Bajo potencial actual'}
              </p>
            </div>
          </div>

          {/* Client info card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Informacion del cliente</h2>
            <div className="space-y-3">
              {client.email && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm text-gray-900 truncate">{client.email}</p>
                  </div>
                </div>
              )}
              {client.industry && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Industria</p>
                    <p className="text-sm text-gray-900">{client.industry}</p>
                  </div>
                </div>
              )}
              {client.company_size && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Empleados</p>
                    <p className="text-sm text-gray-900">{client.company_size}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Cliente desde</p>
                  <p className="text-sm text-gray-900">
                    {new Date(client.created_at).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Proposals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Total propuestas</p>
              <p className="text-2xl font-bold text-gray-900">{client.proposals.length}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Aceptadas</p>
              <p className="text-2xl font-bold text-emerald-600">{acceptedCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Valor total</p>
              <p className="text-lg font-bold text-gray-900">{formatCLP(totalValue)}</p>
              {acceptedValue > 0 && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  {formatCLP(acceptedValue)} cerrado
                </p>
              )}
            </div>
          </div>

          {/* Proposals list */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Historial de propuestas
              </h2>
              <Link
                href={`/proposals/new?client=${client.id}`}
                className="text-xs text-[#1D9E75] font-medium hover:underline"
              >
                + Nueva propuesta
              </Link>
            </div>

            {client.proposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Sin propuestas</h3>
                <p className="text-xs text-gray-500 max-w-xs mb-4">
                  Aun no hay propuestas para este cliente. Crea la primera ahora.
                </p>
                <Link
                  href={`/proposals/new?client=${client.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-[#1D9E75] font-medium hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Crear propuesta
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {client.proposals.map((proposal) => {
                  const config = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.draft
                  const Icon = config.icon
                  return (
                    <li key={proposal.id}>
                      <Link
                        href={`/proposals/${proposal.id}`}
                        aria-label={`Ver propuesta ${proposal.title}`}
                        className="group flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-inset"
                      >
                        <div className={`h-9 w-9 rounded-lg border ${config.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`h-4 w-4 ${config.color}`} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#1D9E75] transition-colors">
                            {proposal.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(proposal.created_at).toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCLP(proposal.value)}
                          </p>
                          <span className={`text-xs font-medium ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <ChevronRight
                          className="h-4 w-4 text-gray-300 group-hover:text-[#1D9E75] group-hover:translate-x-0.5 transition-all flex-shrink-0"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
