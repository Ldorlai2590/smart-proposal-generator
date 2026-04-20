'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { FileText, CheckCircle2, TrendingUp, Users } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { formatCompact, formatCurrency } from '@/lib/format'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function useDemoAuth() {
  if (DEMO_MODE) return { orgId: 'demo' as string | null }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuth } = require('@clerk/nextjs')
  return useAuth() as { orgId: string | null }
}

type ProposalStatus = 'draft' | 'generating' | 'generated' | 'sent' | 'accepted' | 'rejected'

interface ApiProposal {
  id: string
  status: ProposalStatus
  client_id: string
  created_at: string
  updated_at: string
}

interface ApiClient {
  id: string
  name: string
  industry: string | null
}

interface ProposalsResponse {
  data: ApiProposal[]
  total: number
}

interface ClientsResponse {
  data: ApiClient[]
  total: number
}

interface LineChartData {
  month: string
  enviadas: number
  aceptadas: number
}

interface IndustryData {
  industry: string
  value: number
}

interface StatusData {
  name: ProposalStatus
  value: number
  color: string
}

interface TopClientData {
  id: string
  name: string
  industry: string
  proposals: number
  acceptedCount: number
  closingRate: string
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Borrador',
  generating: 'Generando',
  generated: 'Generada',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="h-3 bg-gray-200 rounded-full w-1/2 mb-3 animate-pulse" />
      <div className="h-8 bg-gray-100 rounded-lg w-1/3 animate-pulse" />
    </div>
  )
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="h-3 bg-gray-200 rounded-full w-1/2 mb-4 animate-pulse" />
      <div style={{ height }} className="bg-gray-100 rounded-lg animate-pulse" />
    </div>
  )
}

function getMonthName(date: Date): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return months[date.getMonth()]
}

function getLastNMonths(n: number): Date[] {
  const dates: Date[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    dates.push(date)
  }
  return dates
}

function computeLineChartData(proposals: ApiProposal[]): LineChartData[] {
  const lastNMonths = getLastNMonths(12)
  const data: Record<string, LineChartData> = {}

  // Initialize all months
  lastNMonths.forEach((date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const month = getMonthName(date)
    data[key] = { month, enviadas: 0, aceptadas: 0 }
  })

  // Count proposals by month and status
  proposals.forEach((proposal) => {
    const createdDate = new Date(proposal.created_at)
    const key = `${createdDate.getFullYear()}-${createdDate.getMonth()}`
    if (data[key]) {
      // Count "sent" and "accepted" as "enviadas" (sent)
      if (proposal.status === 'sent' || proposal.status === 'accepted' || proposal.status === 'rejected') {
        data[key].enviadas++
      }
      // Count only "accepted" as "aceptadas"
      if (proposal.status === 'accepted') {
        data[key].aceptadas++
      }
    }
  })

  return Object.values(data)
}

function computeStatusData(proposals: ApiProposal[]): StatusData[] {
  const counts = {
    draft: 0,
    generating: 0,
    generated: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
  }

  proposals.forEach((p) => {
    counts[p.status]++
  })

  const items: StatusData[] = [
    { name: 'accepted', value: counts.accepted, color: '#1D9E75' },
    { name: 'sent', value: counts.sent, color: '#2563EB' },
    { name: 'draft', value: counts.draft, color: '#94A3B8' },
    { name: 'rejected', value: counts.rejected, color: '#FCA5A5' },
  ]
  return items.filter((s) => s.value > 0)
}

export default function AnalyticsPage() {
  const { orgId } = useDemoAuth()
  const [proposals, setProposals] = useState<ApiProposal[]>([])
  const [clients, setClients] = useState<ApiClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return

    async function fetchData() {
      setLoading(true)
      try {
        const [proposalsRes, clientsRes] = await Promise.all([
          fetch('/api/proposals'),
          fetch('/api/clients?limit=200'),
        ])

        if (!proposalsRes.ok || !clientsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const proposalsJson: ProposalsResponse = await proposalsRes.json()
        const clientsJson: ClientsResponse = await clientsRes.json()

        setProposals(proposalsJson.data)
        setClients(clientsJson.data)
      } catch (err) {
        console.error('Failed to fetch analytics data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [orgId])

  // Compute analytics
  const totalProposals = proposals.length
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length
  const closingRate = totalProposals > 0 ? Math.round((acceptedCount / totalProposals) * 100) : 0

  const lineData = computeLineChartData(proposals)
  const statusData = computeStatusData(proposals)

  // Compute revenue by industry
  const industryMap = new Map<string, number>()

  proposals.forEach((proposal) => {
    const client = clients.find((c) => c.name === proposal.client_id || c.id === proposal.client_id)
    if (client && client.industry) {
      const amount = 5000 // placeholder: average per proposal
      industryMap.set(client.industry, (industryMap.get(client.industry) || 0) + amount)
    }
  })

  const barData: IndustryData[] = Array.from(industryMap.entries())
    .map(([industry, value]) => ({ industry, value }))
    .sort((a, b) => b.value - a.value)

  // Compute top clients by proposal count
  const clientProposalMap = new Map<string, { name: string; industry: string; proposals: number; accepted: number }>()
  proposals.forEach((proposal) => {
    const client = clients.find((c) => c.name === proposal.client_id || c.id === proposal.client_id)
    if (client) {
      const existing = clientProposalMap.get(client.id) || {
        name: client.name,
        industry: client.industry || 'Sin industria',
        proposals: 0,
        accepted: 0,
      }
      existing.proposals++
      if (proposal.status === 'accepted') {
        existing.accepted++
      }
      clientProposalMap.set(client.id, existing)
    }
  })

  const topClients: TopClientData[] = Array.from(clientProposalMap.entries())
    .map(([id, data]) => ({
      id,
      ...data,
      acceptedCount: data.accepted,
      closingRate: `${data.proposals > 0 ? Math.round((data.accepted / data.proposals) * 100) : 0}%`,
    }))
    .sort((a, b) => b.proposals - a.proposals)
    .slice(0, 5)

  const activeClientsCount = clientProposalMap.size

  // Show empty state if no data
  if (!loading && totalProposals === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
          <p className="text-sm text-gray-500 mt-0.5">Métricas de rendimiento de tus propuestas.</p>
        </div>

        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Aún no hay datos suficientes</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Genera propuestas para comenzar a ver métricas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
        <p className="text-sm text-gray-500 mt-0.5">Métricas de rendimiento de tus propuestas.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total propuestas" value={totalProposals} icon={FileText} trend={0} />
            <StatCard label="Tasa de cierre" value={`${closingRate}%`} icon={TrendingUp} trend={0} iconColor="#1D9E75" iconBg="#e6f7f2" />
            <StatCard label="Aceptadas" value={acceptedCount} icon={CheckCircle2} trend={0} iconColor="#1D9E75" iconBg="#e6f7f2" />
            <StatCard label="Enviadas" value={proposals.filter((p) => p.status === 'sent').length} icon={FileText} trend={0} />
            <StatCard label="Clientes activos" value={activeClientsCount} icon={Users} trend={0} iconColor="#2563EB" iconBg="#EFF6FF" />
            <StatCard label="Borradores" value={proposals.filter((p) => p.status === 'draft').length} icon={FileText} trend={0} />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton height={280} />
          </>
        ) : lineData.length > 0 ? (
          <>
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Enviadas vs. Aceptadas — 12 meses</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="enviadas" stroke="#94A3B8" strokeWidth={2} dot={false} name="Enviadas" />
                  <Line type="monotone" dataKey="aceptadas" stroke="#1D9E75" strokeWidth={2} dot={false} name="Aceptadas" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Por estado</h3>
              {statusData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={62} dataKey="value" strokeWidth={0}>
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {statusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-500 flex-1">{STATUS_LABELS[item.name]}</span>
                        <span className="text-xs font-bold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  Sin datos
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <ChartSkeleton />
            <ChartSkeleton height={280} />
          </>
        )}
      </div>

      {/* Bar chart + Top clients */}
      <div className="grid lg:grid-cols-2 gap-4">
        {loading ? (
          <>
            <ChartSkeleton height={200} />
            <ChartSkeleton height={200} />
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Valor por industria</h3>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} layout="vertical" barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} />
                    <YAxis type="category" dataKey="industry" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} formatter={(v) => [formatCurrency(Number(v), 'USD'), 'Valor']} />
                    <Bar dataKey="value" fill="#1D9E75" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  Sin datos de industria
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Top clientes por volumen</h3>
              {topClients.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wider">
                      <th className="text-left pb-3 font-semibold">Cliente</th>
                      <th className="text-right pb-3 font-semibold">Props.</th>
                      <th className="text-right pb-3 font-semibold">Cierre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topClients.map((client) => (
                      <tr key={client.id}>
                        <td className="py-2.5">
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.industry}</p>
                        </td>
                        <td className="py-2.5 text-right text-sm text-gray-600">{client.proposals}</td>
                        <td className="py-2.5 text-right">
                          <span className="text-xs font-semibold text-[#1D9E75]">{client.closingRate}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-500">
                  Sin clientes con propuestas
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
