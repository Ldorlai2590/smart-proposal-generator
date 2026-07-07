'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Minimal shape both charts need. The dashboard passes its real proposals here so
// these render live data instead of the previous hardcoded demo constants.
interface ChartProposal {
  status: string
  createdAt: string
  budget?: number
}

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function ProposalsBarChart({ proposals }: { proposals: ChartProposal[] }) {
  // Build the trailing 6 months (including the current one) and bucket proposals.
  const now = new Date()
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTHS_ES[d.getMonth()], enviadas: 0, aceptadas: 0 }
  })
  const idx = new Map(buckets.map((b, i) => [b.key, i]))

  for (const p of proposals) {
    const d = new Date(p.createdAt)
    if (isNaN(d.getTime())) continue
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (i === undefined) continue
    if (p.status !== 'draft') buckets[i].enviadas += 1
    if (p.status === 'accepted') buckets[i].aceptadas += 1
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Propuestas por mes</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={buckets} barSize={10}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
          <Bar dataKey="enviadas" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Enviadas" />
          <Bar dataKey="aceptadas" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Aceptadas" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ClosingRateDonut({ proposals }: { proposals: ChartProposal[] }) {
  const total = proposals.length
  const counts = {
    accepted: proposals.filter((p) => p.status === 'accepted').length,
    sent: proposals.filter((p) => p.status === 'sent').length,
    draft: proposals.filter((p) => p.status === 'draft').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  }
  const rate = total > 0 ? Math.round((counts.accepted / total) * 100) : 0

  const legend = [
    { name: 'Aceptadas', value: counts.accepted, color: '#1D9E75' },
    { name: 'En revisión', value: counts.sent, color: '#2563EB' },
    { name: 'Borrador', value: counts.draft, color: '#94A3B8' },
    { name: 'Rechazadas', value: counts.rejected, color: '#FCA5A5' },
  ]
  const nonZero = legend.filter((d) => d.value > 0)
  const chartData = nonZero.length ? nonZero : [{ name: 'Sin datos', value: 1, color: '#E2E8F0' }]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Tasa de cierre</h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={56} dataKey="value" strokeWidth={0}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-black text-gray-900">{rate}%</span>
          </div>
        </div>
        <div className="space-y-2">
          {legend.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-500">{item.name}</span>
              <span className="text-xs font-semibold text-gray-900 ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
