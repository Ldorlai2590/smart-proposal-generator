'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, Building2, TrendingUp, Users, AlertCircle } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { fetchWithTenant } from '@/lib/api'
import { z } from 'zod/v4'

interface Client {
  id: string
  name: string
  company: string
  industry: string
  email: string
  score: number
  proposals: number
}

interface ApiClient {
  id: string
  name: string
  company: string | null
  industry: string | null
  email: string | null
  score: number
  created_at: string
}

interface ApiResponse {
  data: ApiClient[]
  total: number
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-pink-500 to-rose-600',
  'from-indigo-500 to-blue-600',
]

// Zod schema for client creation
const clientFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').trim(),
  company: z.string().min(1, 'La empresa es requerida').trim(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  industry: z.string().optional(),
  company_size: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientFormSchema>

const INDUSTRY_OPTIONS = ['Tecnología', 'Finanzas', 'Salud', 'Educación', 'Retail', 'Manufactura', 'Servicios', 'Otro']
const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+']

function mapApiClient(apiClient: ApiClient): Client {
  return {
    id: apiClient.id,
    name: apiClient.name,
    company: apiClient.company ?? '—',
    industry: apiClient.industry ?? 'Sin industria',
    email: apiClient.email ?? '',
    score: apiClient.score,
    proposals: 0,
  }
}

function ClientCardSkeleton({ index }: { index: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden">
      <div className="flex items-start gap-3 mb-4">
        <div
          className={`h-11 w-11 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[index % AVATAR_COLORS.length]} opacity-30 flex-shrink-0 animate-pulse`}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3.5 bg-gray-200 rounded-full w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
      </div>
      <div className="mb-3 space-y-1.5">
        <div className="flex justify-between">
          <div className="h-3 bg-gray-100 rounded-full w-20 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded-full w-8 animate-pulse" />
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="h-3 bg-gray-100 rounded-full w-24 animate-pulse" />
    </div>
  )
}

function NewClientDialog({
  open,
  onOpenChange,
  onClientCreated,
  orgId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientCreated: () => void
  orgId: string
}) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    company: '',
    email: '',
    industry: '',
    company_size: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    setApiError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setApiError('')

    try {
      // Validate form data
      const validated = clientFormSchema.parse(formData)

      setSubmitting(true)
      const res = await fetchWithTenant('/clients', orgId, {
        method: 'POST',
        body: JSON.stringify({
          name: validated.name,
          company: validated.company,
          email: validated.email || null,
          industry: validated.industry || null,
          company_size: validated.company_size || null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        setApiError(
          errorData.detail || `Error al crear cliente (${res.status})`
        )
        return
      }

      // Success
      setFormData({
        name: '',
        company: '',
        email: '',
        industry: '',
        company_size: '',
      })
      onOpenChange(false)
      onClientCreated()
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.issues.forEach((error) => {
          const path = error.path[0]
          if (path != null && typeof path === 'string') {
            fieldErrors[path] = error.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setApiError('Error al crear el cliente. Intenta de nuevo.')
        console.error('Create client error:', err)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {apiError && (
            <div className="flex gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Juan García"
              disabled={submitting}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Ej: Acme Inc."
              disabled={submitting}
              aria-invalid={!!errors.company}
            />
            {errors.company && <p className="text-xs text-red-600 mt-1">{errors.company}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ej: juan@acme.com"
              disabled={submitting}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industria</label>
            <select
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              disabled={submitting}
              className="h-8 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-[#1D9E75] focus-visible:ring-3 focus-visible:ring-[#1D9E75]/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecciona una industria</option>
              {INDUSTRY_OPTIONS.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Company Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño de empresa</label>
            <select
              name="company_size"
              value={formData.company_size}
              onChange={handleChange}
              disabled={submitting}
              className="h-8 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-[#1D9E75] focus-visible:ring-3 focus-visible:ring-[#1D9E75]/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecciona un tamaño</option>
              {COMPANY_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} empleados
                </option>
              ))}
            </select>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="bg-[#1D9E75] text-white hover:bg-[#158a63]"
          >
            {submitting ? 'Creando...' : 'Crear cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ClientsPage() {
  const { orgId } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('Todas')
  const [dialogOpen, setDialogOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchClients = useCallback(
    async (query: string) => {
      if (!orgId) return
      setLoading(true)
      try {
        const path = query
          ? `/clients?search=${encodeURIComponent(query)}&limit=50`
          : '/clients?limit=50'
        const res = await fetchWithTenant(path, orgId)
        if (!res.ok) throw new Error(`API error ${res.status}`)
        const json: ApiResponse = await res.json()
        setClients(json.data.map(mapApiClient))
        setTotal(json.total)
      } catch (err) {
        console.error('Failed to fetch clients:', err)
      } finally {
        setLoading(false)
      }
    },
    [orgId],
  )

  // Initial fetch
  useEffect(() => {
    fetchClients('')
  }, [fetchClients])

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setIndustry('Todas') // reset industry filter on new search
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchClients(value)
    }, 300)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Dynamic industry list built from fetched data
  const industries = ['Todas', ...Array.from(new Set(clients.map((c) => c.industry))).sort()]

  // Client-side industry filter (applied on top of server search results)
  const filtered = clients.filter((c) => industry === 'Todas' || c.industry === industry)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Cargando...' : `${total} clientes registrados`}
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>

      {orgId && (
        <NewClientDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onClientCreated={() => fetchClients(search)}
          orgId={orgId}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm w-64"
            placeholder="Buscar cliente o empresa..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {industries.map((ind) => (
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
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ClientCardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : filtered.length === 0 && !search ? (
        /* Empty state — no clients at all */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sin clientes aún</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Agrega tu primer cliente para empezar a generar propuestas.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state — search/filter returned nothing */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sin resultados</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            No se encontraron clientes para &ldquo;{search}&rdquo;.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
