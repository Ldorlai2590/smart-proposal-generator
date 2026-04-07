'use client'

import { useState } from 'react'
import { Search, Plus, Building2, TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  company: string
  industry: string
  email: string
  score: number
  proposals: number
}

const MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'María López', company: 'TechCorp SA', industry: 'Tecnología', email: 'maria@techcorp.com', score: 85, proposals: 4 },
  { id: '2', name: 'Carlos Mendoza', company: 'Retail Plus', industry: 'Retail', email: 'carlos@retailplus.com', score: 72, proposals: 2 },
  { id: '3', name: 'Ana García', company: 'HealthMed', industry: 'Salud', email: 'ana@healthmed.com', score: 91, proposals: 6 },
  { id: '4', name: 'Luis Torres', company: 'EduTech', industry: 'Educación', email: 'luis@edutech.com', score: 64, proposals: 1 },
  { id: '5', name: 'Sofia Rodríguez', company: 'FinCorp', industry: 'Finanzas', email: 'sofia@fincorp.com', score: 88, proposals: 3 },
  { id: '6', name: 'Pablo Jiménez', company: 'LogiPro', industry: 'Logística', email: 'pablo@logipro.com', score: 77, proposals: 5 },
]

const INDUSTRIES = ['Todas', 'Tecnología', 'Retail', 'Salud', 'Educación', 'Finanzas', 'Logística']

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
]

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('Todas')

  const filtered = MOCK_CLIENTS.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
    const matchIndustry = industry === 'Todas' || c.industry === industry
    return matchSearch && matchIndustry
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{MOCK_CLIENTS.length} clientes registrados</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors">
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm w-64"
            placeholder="Buscar cliente o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustry(ind)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
                industry === ind
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client, i) => (
          <div
            key={client.id}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`h-11 w-11 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center flex-shrink-0`}
              >
                <span className="text-white font-bold text-sm">{client.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{client.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500 truncate">{client.company}</p>
                </div>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                {client.industry}
              </span>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Oportunidad
                </span>
                <span className="text-xs font-bold text-gray-900">{client.score}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${client.score}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {client.proposals} propuesta{client.proposals !== 1 ? 's' : ''}
              </span>
              <button className="text-xs text-[#1D9E75] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Ver propuestas →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
