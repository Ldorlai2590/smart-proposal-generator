'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, Building2, CheckCircle2, AlertCircle, Globe, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface WebsiteAnalysis {
  business_model: string
  value_proposition: string
  target_audience: string
  key_differentiators: string[]
  pain_points: string[]
  opportunities: string[]
  communication_tone: string
  executive_summary: string
}


export interface ClientData {
  id: string
  name: string
  company: string
  email?: string
  industry?: string
  companySize?: string
  score?: number
  isNew?: boolean
  // v2 — contact persona
  contact_name?: string
  contact_role?: string
  contact_phone?: string
  // v2 — RRSS
  website?: string
  instagram?: string
  facebook?: string
  linkedin?: string
  tiktok?: string
  // v2 — AI analysis
  ai_business_model?: string
  ai_value_prop?: string
  ai_opportunities?: string[]
  ai_weaknesses?: string[]
  ai_communication_tone?: string
  ai_executive_summary?: string
}

interface Step1ClientProps {
  onNext: (client: ClientData) => void
}

interface ApiClient {
  id: string
  tenant_id: string
  name: string
  company: string | null
  email: string | null
  industry: string | null
  company_size: string | null
  score: number
}

interface ApiListResponse {
  items: ApiClient[]
  total: number
  page: number
  per_page: number
  pages: number
}

const INDUSTRIES = ['Tecnología', 'Retail', 'Salud', 'Educación', 'Finanzas', 'Manufactura', 'Logística', 'Otro']

function mapApiClient(c: ApiClient): ClientData {
  return {
    id: c.id,
    name: c.name,
    company: c.company ?? '',
    email: c.email ?? undefined,
    industry: c.industry ?? undefined,
    companySize: c.company_size ?? undefined,
    score: c.score,
  }
}

function AnalysisCard({
  analysis,
  expanded,
  onToggle,
}: {
  analysis: WebsiteAnalysis
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-lg border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/5 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <CheckCircle2 className="h-4 w-4 text-[var(--color-brand)] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--color-brand)]">Sitio analizado con IA ✓</p>
          <p className="text-xs text-gray-600 truncate">{analysis.executive_summary}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-[var(--color-brand)]/20 pt-2">
          <Detail label="Modelo de negocio" value={analysis.business_model} />
          <Detail label="Propuesta de valor" value={analysis.value_proposition} />
          <Detail label="Público objetivo" value={analysis.target_audience} />
          {analysis.key_differentiators.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Diferenciadores</p>
              <ul className="space-y-0.5">
                {analysis.key_differentiators.map((d, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                    <span className="text-[var(--color-brand)] mt-0.5">·</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.opportunities.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Oportunidades detectadas</p>
              <ul className="space-y-0.5">
                {analysis.opportunities.map((o, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                    <span className="text-amber-500 mt-0.5">→</span> {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-gray-400">
            Tono detectado: <span className="font-medium text-gray-600">{analysis.communication_tone}</span>
          </p>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-500 uppercase">{label}</p>
      <p className="text-xs text-gray-700 mt-0.5">{value}</p>
    </div>
  )
}

export function Step1Client({ onNext }: Step1ClientProps) {
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<ClientData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ClientData | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    email: '',
    industry: '',
    companySize: '',
    website: '',
  })

  // Website analysis state (shared between create + select flows)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [websiteAnalysis, setWebsiteAnalysis] = useState<WebsiteAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [showAnalysisDetail, setShowAnalysisDetail] = useState(false)

  async function analyzeWebsite(url: string, company: string, industry?: string) {
    setIsAnalyzing(true)
    setAnalyzeError(null)
    setWebsiteAnalysis(null)
    try {
      const res = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, company, industry }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.debug?.msg || data?.message || `Error ${res.status}`)
      setWebsiteAnalysis(data as WebsiteAnalysis)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'No se pudo analizar el sitio')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchClients = useCallback(async (search: string) => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: '1', per_page: '20' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/clients?${params.toString()}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data: ApiListResponse = await res.json()
      setClients(data.items.map(mapApiClient))
    } catch {
      setFetchError('No se pudieron cargar los clientes. Verifique la conexión con la API.')
      setClients([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchClients('')
  }, [fetchClients])

  // Debounced search
  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchClients(value)
    }, 300)
  }

  async function handleCreate() {
    if (!newClient.name || !newClient.company) return
    setIsCreating(true)
    setCreateError(null)
    try {
      const body = {
        name: newClient.name,
        company: newClient.company,
        email: newClient.email || null,
        industry: newClient.industry || null,
        company_size: newClient.companySize || null,
      }
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => null)
        throw new Error(detail?.error ?? detail?.detail ?? `Error ${res.status}`)
      }
      const created: ApiClient = await res.json()
      const clientData: ClientData = {
        ...mapApiClient(created),
        isNew: true,
        website: newClient.website || undefined,
        ai_business_model: websiteAnalysis?.business_model,
        ai_value_prop: websiteAnalysis?.value_proposition,
        ai_opportunities: websiteAnalysis?.opportunities,
        ai_weaknesses: websiteAnalysis?.pain_points,
        ai_communication_tone: websiteAnalysis?.communication_tone,
        ai_executive_summary: websiteAnalysis?.executive_summary,
      }
      onNext(clientData)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear el cliente.')
    } finally {
      setIsCreating(false)
    }
  }

  const noResults = !isLoading && clients.length === 0 && query !== ''
  const emptyInitial = !isLoading && clients.length === 0 && query === ''

  if (showCreate) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => { setShowCreate(false); setCreateError(null) }}
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

        {/* Website URL + AI analysis */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Sitio web de la empresa
          </label>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://empresa.com"
              value={newClient.website}
              onChange={(e) => {
                setNewClient((p) => ({ ...p, website: e.target.value }))
                setWebsiteAnalysis(null)
                setAnalyzeError(null)
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!newClient.website || isAnalyzing}
              onClick={() => analyzeWebsite(newClient.website, newClient.company, newClient.industry)}
              className="whitespace-nowrap gap-1.5"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analizando...</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5 text-[var(--color-brand)]" /> Analizar con IA</>
              )}
            </Button>
          </div>
          {analyzeError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {analyzeError}
            </p>
          )}
          {websiteAnalysis && <AnalysisCard analysis={websiteAnalysis} expanded={showAnalysisDetail} onToggle={() => setShowAnalysisDetail(!showAnalysisDetail)} />}
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

        {createError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {createError}
          </div>
        )}

        <div className="pt-2">
          <Button
            onClick={handleCreate}
            disabled={!newClient.name || !newClient.company || isCreating}
            className="w-full"
            size="lg"
          >
            {isCreating ? 'Creando...' : 'Crear cliente y continuar'}
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
          onChange={(e) => handleQueryChange(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-6 justify-center">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {fetchError}
          </div>
        ) : clients.length > 0 ? (
          clients.map((client) => (
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
                  {client.score != null && client.score > 0 && (
                    <Badge variant={client.score >= 80 ? 'default' : 'secondary'}>
                      {client.score}% oportunidad
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {client.company && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Building2 className="h-3 w-3" />
                      {client.company}
                    </span>
                  )}
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
        ) : noResults ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-gray-500 text-sm">No se encontraron clientes con &quot;{query}&quot;</p>
            <button
              onClick={() => {
                setNewClient((p) => ({ ...p, name: query }))
                setShowCreate(true)
              }}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-brand)] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Crear &quot;{query}&quot; como nuevo cliente
            </button>
          </div>
        ) : emptyInitial ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aún no hay clientes registrados. Crea el primero.
          </div>
        ) : null}
      </div>

      {/* URL analysis panel for existing client selection */}
      {selected && (
        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Sitio web (opcional · mejora la propuesta con IA)
          </label>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://empresa.com"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value)
                setWebsiteAnalysis(null)
                setAnalyzeError(null)
              }}
              className="flex-1 h-8 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!websiteUrl || isAnalyzing}
              onClick={() => analyzeWebsite(websiteUrl, selected.company, selected.industry)}
              className="h-8 whitespace-nowrap gap-1 text-xs"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Analizando...</>
              ) : (
                <><Sparkles className="h-3 w-3 text-[var(--color-brand)]" /> Analizar</>
              )}
            </Button>
          </div>
          {analyzeError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {analyzeError}
            </p>
          )}
          {websiteAnalysis && <AnalysisCard analysis={websiteAnalysis} expanded={showAnalysisDetail} onToggle={() => setShowAnalysisDetail(!showAnalysisDetail)} />}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm text-[var(--color-brand)] hover:underline"
        >
          <Plus className="h-4 w-4" />
          Crear nuevo cliente
        </button>
        <div className="flex-1" />
        <Button
          onClick={() => {
            if (!selected) return
            const enriched: ClientData = {
              ...selected,
              website: websiteUrl || selected.website,
              ai_business_model: websiteAnalysis?.business_model ?? selected.ai_business_model,
              ai_value_prop: websiteAnalysis?.value_proposition ?? selected.ai_value_prop,
              ai_opportunities: websiteAnalysis?.opportunities ?? selected.ai_opportunities,
              ai_weaknesses: websiteAnalysis?.pain_points ?? selected.ai_weaknesses,
              ai_communication_tone: websiteAnalysis?.communication_tone ?? selected.ai_communication_tone,
              ai_executive_summary: websiteAnalysis?.executive_summary ?? selected.ai_executive_summary,
            }
            onNext(enriched)
          }}
          disabled={!selected}
          size="lg"
        >
          {websiteAnalysis ? 'Continuar con análisis →' : 'Continuar'}
        </Button>
      </div>
    </div>
  )
}
