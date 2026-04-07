import Link from 'next/link'
import { currentUser } from '@clerk/nextjs/server'
import { Plus, FileText, CheckCircle2, Clock, DollarSign } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { ProposalsBarChart, ClosingRateDonut } from '@/components/dashboard/ProposalsChart'

const RECENT_PROPOSALS = [
  { id: '1', title: 'Plataforma e-commerce', client: 'TechCorp SA', status: 'accepted', date: 'Hoy', value: '$12,000' },
  { id: '2', title: 'Consultoría digital', client: 'Retail Plus', status: 'sent', date: 'Ayer', value: '$8,500' },
  { id: '3', title: 'Migración cloud', client: 'HealthMed', status: 'draft', date: 'Hace 2 días', value: '$24,000' },
  { id: '4', title: 'App móvil', client: 'EduTech', status: 'rejected', date: 'Hace 3 días', value: '$18,000' },
  { id: '5', title: 'CRM personalizado', client: 'FinCorp', status: 'sent', date: 'Hace 5 días', value: '$31,000' },
]

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

export default async function DashboardPage() {
  const user = await currentUser()
  const firstName = user?.firstName ?? 'equipo'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Propuestas totales"
          value={48}
          icon={FileText}
          trend={12}
          trendLabel="vs mes anterior"
        />
        <StatCard
          label="Aceptadas"
          value={32}
          icon={CheckCircle2}
          trend={8}
          iconColor="#1D9E75"
          iconBg="#e6f7f2"
        />
        <StatCard
          label="En revisión"
          value={10}
          icon={Clock}
          trend={-3}
          iconColor="#F59E0B"
          iconBg="#FFFBEB"
        />
        <StatCard
          label="Valor total"
          value="$93.5K"
          icon={DollarSign}
          trend={22}
          iconColor="#7C3AED"
          iconBg="#F5F3FF"
        />
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
          <div className="space-y-1">
            {RECENT_PROPOSALS.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{proposal.title}</p>
                  <p className="text-xs text-gray-400">{proposal.client}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[proposal.status]}`}
                >
                  {STATUS_LABELS[proposal.status]}
                </span>
                <span className="text-xs font-semibold text-gray-700 w-16 text-right">
                  {proposal.value}
                </span>
                <span className="text-xs text-gray-400 w-20 text-right">{proposal.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <ClosingRateDonut />
      </div>

      {/* Bar chart */}
      <ProposalsBarChart />
    </div>
  )
}
