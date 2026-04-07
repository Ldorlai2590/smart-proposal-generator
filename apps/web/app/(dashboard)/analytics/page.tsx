'use client'

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { FileText, CheckCircle2, DollarSign, TrendingUp, Clock, Users } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'

const LINE_DATA = [
  { month: 'May', enviadas: 6, aceptadas: 4 },
  { month: 'Jun', enviadas: 9, aceptadas: 5 },
  { month: 'Jul', enviadas: 11, aceptadas: 7 },
  { month: 'Ago', enviadas: 8, aceptadas: 6 },
  { month: 'Sep', enviadas: 14, aceptadas: 9 },
  { month: 'Oct', enviadas: 10, aceptadas: 8 },
  { month: 'Nov', enviadas: 13, aceptadas: 10 },
  { month: 'Dic', enviadas: 16, aceptadas: 12 },
  { month: 'Ene', enviadas: 9, aceptadas: 6 },
  { month: 'Feb', enviadas: 18, aceptadas: 14 },
  { month: 'Mar', enviadas: 12, aceptadas: 9 },
  { month: 'Abr', enviadas: 7, aceptadas: 6 },
]

const BAR_INDUSTRY = [
  { industry: 'Tecnología', value: 42000 },
  { industry: 'Retail', value: 28000 },
  { industry: 'Salud', value: 35000 },
  { industry: 'Finanzas', value: 51000 },
  { industry: 'Logística', value: 19000 },
]

const DONUT_STATUS = [
  { name: 'Aceptadas', value: 41, color: '#1D9E75' },
  { name: 'Enviadas', value: 27, color: '#2563EB' },
  { name: 'Borrador', value: 20, color: '#94A3B8' },
  { name: 'Rechazadas', value: 12, color: '#FCA5A5' },
]

const TOP_CLIENTS = [
  { name: 'FinCorp', company: 'Finanzas', proposals: 3, value: '$51,000', rate: '100%' },
  { name: 'TechCorp SA', company: 'Tecnología', proposals: 4, value: '$42,000', rate: '75%' },
  { name: 'HealthMed', company: 'Salud', proposals: 6, value: '$35,000', rate: '83%' },
  { name: 'Retail Plus', company: 'Retail', proposals: 2, value: '$28,000', rate: '50%' },
  { name: 'LogiPro', company: 'Logística', proposals: 5, value: '$19,000', rate: '60%' },
]

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
        <p className="text-sm text-gray-500 mt-0.5">Métricas de rendimiento de tus propuestas.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total propuestas" value={143} icon={FileText} trend={18} />
        <StatCard label="Tasa de cierre" value="67%" icon={TrendingUp} trend={5} iconColor="#1D9E75" iconBg="#e6f7f2" />
        <StatCard label="Valor promedio" value="$8.2K" icon={DollarSign} trend={12} iconColor="#7C3AED" iconBg="#F5F3FF" />
        <StatCard label="Aceptadas" value={96} icon={CheckCircle2} trend={22} iconColor="#1D9E75" iconBg="#e6f7f2" />
        <StatCard label="Tiempo promedio" value="2.4 días" icon={Clock} trend={-8} iconColor="#F59E0B" iconBg="#FFFBEB" />
        <StatCard label="Clientes activos" value={24} icon={Users} trend={15} iconColor="#2563EB" iconBg="#EFF6FF" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Enviadas vs. Aceptadas — 12 meses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={LINE_DATA}>
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
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={DONUT_STATUS} cx="50%" cy="50%" innerRadius={45} outerRadius={62} dataKey="value" strokeWidth={0}>
                {DONUT_STATUS.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {DONUT_STATUS.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-500 flex-1">{item.name}</span>
                <span className="text-xs font-bold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart + Top clients */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Valor por industria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={BAR_INDUSTRY} layout="vertical" barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}K`} />
              <YAxis type="category" dataKey="industry" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Valor']} />
              <Bar dataKey="value" fill="#1D9E75" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top clientes por valor</h3>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left pb-3 font-semibold">Cliente</th>
                <th className="text-right pb-3 font-semibold">Props.</th>
                <th className="text-right pb-3 font-semibold">Valor</th>
                <th className="text-right pb-3 font-semibold">Cierre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {TOP_CLIENTS.map((client) => (
                <tr key={client.name}>
                  <td className="py-2.5">
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-400">{client.company}</p>
                  </td>
                  <td className="py-2.5 text-right text-sm text-gray-600">{client.proposals}</td>
                  <td className="py-2.5 text-right text-sm font-semibold text-gray-900">{client.value}</td>
                  <td className="py-2.5 text-right">
                    <span className="text-xs font-semibold text-[#1D9E75]">{client.rate}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
