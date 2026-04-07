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

const BAR_DATA = [
  { month: 'Nov', enviadas: 8, aceptadas: 5 },
  { month: 'Dic', enviadas: 12, aceptadas: 9 },
  { month: 'Ene', enviadas: 7, aceptadas: 4 },
  { month: 'Feb', enviadas: 15, aceptadas: 11 },
  { month: 'Mar', enviadas: 10, aceptadas: 7 },
  { month: 'Abr', enviadas: 6, aceptadas: 5 },
]

const DONUT_DATA = [
  { name: 'Aceptadas', value: 41, color: '#1D9E75' },
  { name: 'En revisión', value: 27, color: '#2563EB' },
  { name: 'Borrador', value: 20, color: '#94A3B8' },
  { name: 'Rechazadas', value: 12, color: '#FCA5A5' },
]

export function ProposalsBarChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Propuestas por mes</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={BAR_DATA} barSize={10}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
          />
          <Bar dataKey="enviadas" fill="#E2E8F0" radius={[4, 4, 0, 0]} name="Enviadas" />
          <Bar dataKey="aceptadas" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Aceptadas" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ClosingRateDonut() {
  const rate = 67

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Tasa de cierre</h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={DONUT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={56}
                dataKey="value"
                strokeWidth={0}
              >
                {DONUT_DATA.map((entry, index) => (
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
          {DONUT_DATA.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-500">{item.name}</span>
              <span className="text-xs font-semibold text-gray-900 ml-auto">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
