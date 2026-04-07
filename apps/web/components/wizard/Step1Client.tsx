'use client'

import { useState } from 'react'
import { Search, Plus, Building2, User, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ClientData {
  id: string
  name: string
  company: string
  email?: string
  industry?: string
  companySize?: string
  score?: number
  isNew?: boolean
}

interface Step1ClientProps {
  onNext: (client: ClientData) => void
}

const INDUSTRIES = ['Tecnología', 'Retail', 'Salud', 'Educación', 'Finanzas', 'Manufactura', 'Logística', 'Otro']

const MOCK_CLIENTS: ClientData[] = [
  { id: '1', name: 'María López', company: 'TechCorp SA', email: 'maria@techcorp.com', industry: 'Tecnología', score: 85 },
  { id: '2', name: 'Carlos Mendoza', company: 'Retail Plus', email: 'carlos@retailplus.com', industry: 'Retail', score: 72 },
  { id: '3', name: 'Ana García', company: 'HealthMed', email: 'ana@healthmed.com', industry: 'Salud', score: 91 },
]

export function Step1Client({ onNext }: Step1ClientProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ClientData | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    email: '',
    industry: '',
    companySize: '',
  })

  const filtered = MOCK_CLIENTS.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.company.toLowerCase().includes(query.toLowerCase()),
  )

  function handleCreate() {
    if (!newClient.name || !newClient.company) return
    const client: ClientData = {
      id: crypto.randomUUID(),
      ...newClient,
      isNew: true,
    }
    onNext(client)
  }

  if (showCreate) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setShowCreate(false)}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Volver
          </button>
          <span className="text-gray-300">|</span>
          <h3 className="text-sm font-medium text-gray-700">Nuevo cliente</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nombre *</label>
            <Input
              placeholder="Nombre completo"
              value={newClient.name}
              onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Empresa *</label>
            <Input
              placeholder="Nombre de la empresa"
              value={newClient.company}
              onChange={(e) => setNewClient((p) => ({ ...p, company: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
            <Input
              type="email"
              placeholder="correo@empresa.com"
              value={newClient.email}
              onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tamaño</label>
            <select
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
              value={newClient.companySize}
              onChange={(e) => setNewClient((p) => ({ ...p, companySize: e.target.value }))}
            >
              <option value="">Seleccionar</option>
              <option value="1-10">1-10 empleados</option>
              <option value="11-50">11-50 empleados</option>
              <option value="51-200">51-200 empleados</option>
              <option value="201-1000">201-1000 empleados</option>
              <option value="1000+">+1000 empleados</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Industria</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                onClick={() => setNewClient((p) => ({ ...p, industry: ind }))}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm border transition-colors',
                  newClient.industry === ind
                    ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                    : 'border-gray-200 text-gray-700 hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]',
                )}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleCreate}
            disabled={!newClient.name || !newClient.company}
            className="w-full"
            size="lg"
          >
            Crear cliente y continuar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Buscar cliente por nombre o empresa..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelected(selected?.id === client.id ? null : client)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                selected?.id === client.id
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)] shadow-sm'
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
              )}
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-dark)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {client.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                  {client.score && (
                    <Badge variant={client.score >= 80 ? 'default' : 'secondary'}>
                      {client.score}% oportunidad
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 className="h-3 w-3" />
                    {client.company}
                  </span>
                  {client.industry && (
                    <span className="text-xs text-gray-400">{client.industry}</span>
                  )}
                </div>
              </div>
              {selected?.id === client.id && (
                <CheckCircle2 className="h-5 w-5 text-[var(--color-brand)] flex-shrink-0" />
              )}
            </button>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            No se encontraron clientes con &quot;{query}&quot;
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm text-[var(--color-brand)] hover:underline"
        >
          <Plus className="h-4 w-4" />
          Crear nuevo cliente
        </button>
        <div className="flex-1" />
        <Button onClick={() => selected && onNext(selected)} disabled={!selected} size="lg">
          Continuar
        </Button>
      </div>
    </div>
  )
}
