'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, FileText, TrendingUp, Users, DollarSign, RefreshCw } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProposalsBarChart, ClosingRateDonut } from '@/components/dashboard/ProposalsChart'
import { formatCompact, formatCurrency, formatDate, formatDateRelative } from '@/lib/format'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

interface ApiProposal {
  id: string
  title: string
  status: string
  client_id: string
  created_at: string
  context: { budget?: number }
}

interface ApiResponse {
  data: ApiProposal[]
  total: number
}

interface Proposal {
  id: string
  title: string
  client: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  value: string
  date: string
  budget?: number
}

const STATUS_STYLES: Record<string, string> = {
  accepted: 'bg-green-50 text-green-700',
  sent: 'bg-blue-50 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Aceptada',
  sent: 'Enviada',
  draft: 'Borrador',
  rejected: 'Rechazada',
}

function formatBudget(budget?: number): string {
  if (budget == null) return '—'
  return formatCompact(budget)
}

function mapApiProposal(p: ApiProposal): Proposal {
  const validStatuses = new Set<Proposal['status']>(['draft', 'sent', 'accepted', 'rejected'])
  const status: Proposal['status'] = validStatuses.has(p.status as Proposal['status'])
    ? (p.status as Proposal['status'])
    : 'draft'
  return {
    id: p.id,
    title: p.title ?? 'Sin título',
    client: p.client_id,
    status,
    value: formatBudget(p.context?.budget),
    date: formatDateRelative(p.created_at),
    budget: p.context?.budget,
  }
}

// Skeleton loader for stat cards
function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-gray-200 mb-4" />
      <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-24 bg-gray-100 rounded" />
    </div>
  )
}

// Skeleton loader for recent proposals
function SkeletonRecentProposals() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl animate-pulse">
          <div className="flex-1 min-w-0">
            <div className="h-4 w-40 bg-gray-200 rounded mb-1.5" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-4 w-12 bg-gray-100 rounded" />
        </div>
      ))}
    </>
  )
}

function useClerkAuth() {
  const [demoName, setDemoName] = useState<string>('equipo')

  useEffect(() => {
    if (DEMO_MODE) {
      fetch('/api/auth/session')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.authenticated && data.user?.name) {
            // Use first word of name only for greeting
            setDemoName(data.user.name.split(' ')[0])
          }
        })
        .catch(() => {})
    }
  }, [])

  if (DEMO_MODE) return { orgId: 'demo', firstName: demoName }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuth, useUser } = require('@clerk/nextjs')
  const { orgId } = useAuth()
  const { user } = useUser()
  return { orgId, firstName: user?.firstName ?? 'equipo' }
}

export default function DashboardPage() {
  const { orgId, firstName } = useClerkAuth()

  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const fetchProposals = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/proposals')
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`)
      }
      const json: ApiResponse = await res.json()
      setProposals(json.data.map(mapApiProposal))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propuestas')
      setProposals([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  // Calculate stats
  const totalProposals = proposals.length
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length
  const closingRate = totalProposals > 0 ? Math.round((acceptedCount / totalProposals) * 100) : 0
  const uniqueClients = new Set(proposals.map((p) => p.client)).size
  const acceptedValue = proposals
    .filter((p) => p.status === 'accepted')
    .reduce((sum, p) => sum + (p.budget ?? 0), 0)

  // Get 5 most recent proposals
  const recentProposals = proposals.slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(new Date(), 'es-ES')}
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva propuesta
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchProposals}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              label="Propuestas este mes"
              value={totalProposals}
              icon={FileText}
              trendLabel={totalProposals > 0 ? 'propuestas generadas' : 'sin propuestas'}
            />
            <StatCard
              label="Tasa de aceptación"
              value={`${closingRate}%`}
              icon={TrendingUp}
              iconColor="#1D9E75"
              iconBg="#e6f7f2"
              trendLabel={`${acceptedCount} de ${totalProposals} aceptadas`}
            />
            <StatCard
              label="Clientes activos"
              value={uniqueClients}
              icon={Users}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
            />
            <StatCard
              label="Ingresos estimados"
              value={acceptedValue > 0 ? formatCurrency(acceptedValue, 'USD') : '—'}
              icon={DollarSign}
              iconColor="#7C3AED"
              iconBg="#F5F3FF"
              trendLabel="en propuestas aceptadas"
            />
          </>
        )}
      </div>

      {/* Middle row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Recent proposals */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Actividad reciente</h3>
            <Link href="/proposals" className="text-xs text-[#1D9E75] hover:underline">
              Ver todas →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-1">
              <SkeletonRecentProposals />
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">No se pudieron cargar las propuestas</p>
            </div>
          ) : recentProposals.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm text-gray-400 mb-4">Sin propuestas aún</p>
              <Link
                href="/proposals/new"
                className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Crea tu primera propuesta
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{proposal.title}</p>
                    <p className="text-xs text-gray-400">{proposal.client}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[proposal.status]}`}>
                    {STATUS_LABELS[proposal.status]}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 w-16 text-right">{proposal.value}</span>
                  <span className="text-xs text-gray-400 w-20 text-right">{proposal.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Donut */}
        {!loading && proposals.length > 0 && <ClosingRateDonut />}
      </div>

      {/* Bar chart */}
      {!loading && proposals.length > 0 && <ProposalsBarChart />}

      {/* Empty analytics state */}
      {!loading && proposals.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sin analíticas</h3>
          <p className="text-sm text-gray-400 mb-5">
            Genera propuestas para ver analíticas y gráficos de rendimiento.
          </p>
          <Link
            href="/proposals/new"
            className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear propuesta
          </Link>
        </div>
      )}
    </div>
  )
}
