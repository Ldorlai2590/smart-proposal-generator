'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Activity, Search, Eye, Clock, ExternalLink, Bell, Send, MessageCircle, Mail, Copy, X, ChevronRight } from 'lucide-react'
import { DEMO_TRACKED, DEMO_ALERTS, suggestFollowUp } from '@/lib/demo-v2'
import { formatDateRelative } from '@/lib/format'
import type { TrackedProposal, IntentionScore } from '@/lib/types/proposal-tracking'
import { DemoBanner } from '@/components/layout/DemoBanner'
import { isEmptyState } from '@/lib/demo-mode'

type Filter = 'all' | 'high' | 'medium' | 'low' | 'none'

export default function TrackingPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<TrackedProposal | null>(null)
  const [tracked, setTracked] = useState<TrackedProposal[]>(DEMO_TRACKED)
  const [alerts, setAlerts] = useState(DEMO_ALERTS)

  useEffect(() => {
    if (isEmptyState()) {
      setTracked([])
      setAlerts([])
    }
  }, [])

  const filtered = useMemo(() => {
    return tracked.filter((p) => {
      if (query && !p.title.toLowerCase().includes(query.toLowerCase()) && !p.client_name.toLowerCase().includes(query.toLowerCase())) return false
      if (filter !== 'all' && p.intention_score !== filter) return false
      return true
    })
  }, [tracked, query, filter])

  const stats = useMemo(() => {
    const sent = tracked.filter((p) => p.sent_at).length
    const opened = tracked.filter((p) => p.opened_at).length
    const high = tracked.filter((p) => p.intention_score === 'high').length
    const cold = tracked.filter((p) => p.intention_score === 'none' || p.intention_score === 'low').length
    return {
      sent,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      hot: high,
      cold,
    }
  }, [tracked])

  const unreadAlerts = alerts.filter((a) => !a.read)

  // Empty state
  if (tracked.length === 0) {
    return (
      <div>
        <DemoBanner message="Aún no has enviado propuestas." />
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-[#1D9E75]" />
            Seguimiento de propuestas
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cuando envíes propuestas, aquí verás cuándo las abrieron, cuánto tiempo las vieron y si vale la pena hacer follow-up.</p>
        </header>
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-[#e6f7f2] mx-auto mb-4 flex items-center justify-center">
            <Activity className="h-8 w-8 text-[#1D9E75]" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Sin propuestas en seguimiento</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Envía tu primera propuesta y empieza a recibir alertas cuando el cliente la abra, vea el pricing o interactúe con ella.
          </p>
          <Link href="/proposals/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D9E75] text-white text-sm font-semibold rounded-xl hover:bg-[#158a63]">
            Crear mi primera propuesta
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <DemoBanner message="Estás viendo 6 propuestas de ejemplo con tracking simulado." />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-[#1D9E75]" />
          Seguimiento de propuestas
        </h1>
        <p className="text-sm text-gray-500 mt-1">Inteligencia comercial post-envío: quién abrió, cuánto vio y qué hacer ahora.</p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Propuestas enviadas" value={stats.sent} icon={<Send className="h-4 w-4" />} color="blue" />
        <StatCard label="Tasa de apertura" value={`${stats.openRate}%`} icon={<Eye className="h-4 w-4" />} color="green" />
        <StatCard label="Calientes 🔥" value={stats.hot} icon={<Activity className="h-4 w-4" />} color="amber" />
        <StatCard label="Sin movimiento" value={stats.cold} icon={<Clock className="h-4 w-4" />} color="red" />
      </div>

      {/* Alerts strip */}
      {unreadAlerts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-amber-600 animate-pulse" />
            <h3 className="text-sm font-semibold text-amber-900">{unreadAlerts.length} alertas nuevas</h3>
          </div>
          <div className="space-y-1.5">
            {unreadAlerts.slice(0, 3).map((a) => (
              <p key={a.id} className="text-sm text-amber-800">
                • {a.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título o cliente..."
            className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75]"
          />
        </div>
        <div className="flex gap-1 bg-gray-50 p-1 rounded-lg">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'high', label: 'Calientes' },
            { id: 'medium', label: 'Tibias' },
            { id: 'low', label: 'Frías' },
            { id: 'none', label: 'Sin abrir' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as Filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.id ? 'bg-white text-[#1D9E75] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((p) => (
          <TrackingCard key={p.id} proposal={p} onSelect={() => setSelected(p)} />
        ))}
        {filtered.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No hay propuestas con estos filtros</p>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && <Drawer proposal={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

const STAT_COLORS = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
  green: { bg: 'bg-green-50', text: 'text-green-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
  red: { bg: 'bg-red-50', text: 'text-red-700' },
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: keyof typeof STAT_COLORS }) {
  const c = STAT_COLORS[color]
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${c.bg} ${c.text} mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function IntentionBadge({ score }: { score: IntentionScore }) {
  const styles: Record<IntentionScore, { bg: string; text: string; dot: string; label: string; pulse?: boolean }> = {
    high: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Alta intención', pulse: true },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Intención media' },
    low: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Baja intención' },
    none: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'Sin abrir' },
  }
  const s = styles[score]
  return (
    <span className={`inline-flex items-center gap-1.5 ${s.bg} ${s.text} text-xs font-semibold px-2.5 py-1 rounded-full`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  )
}

function TrackingCard({ proposal: p, onSelect }: { proposal: TrackedProposal; onSelect: () => void }) {
  const minutes = Math.floor(p.total_view_seconds / 60)
  const seconds = p.total_view_seconds % 60
  const time = p.total_view_seconds > 0 ? `${minutes}:${String(seconds).padStart(2, '0')} min` : '—'

  return (
    <button onClick={onSelect} className="block w-full text-left bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#1D9E75]/30 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{p.client_name} {p.client_email && <span className="text-gray-400">· {p.client_email}</span>}</p>
        </div>
        <IntentionBadge score={p.intention_score} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Metric label="Enviada" value={p.sent_at ? formatDateRelative(p.sent_at) : '—'} />
        <Metric label="Última vista" value={p.last_viewed_at ? formatDateRelative(p.last_viewed_at) : 'Sin abrir'} />
        <Metric label="Aperturas" value={String(p.view_count)} />
        <Metric label="Tiempo total" value={time} />
      </div>

      {/* Section dots */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">Vistas:</span>
        <SectionDot label="Pricing" filled={p.sections_viewed.pricing} />
        <SectionDot label="Casos" filled={p.sections_viewed.cases} />
        <SectionDot label="CTA" filled={p.sections_viewed.cta} />
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-[#1D9E75] font-medium">
          Ver detalle <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="text-gray-900 font-medium mt-0.5">{value}</p>
    </div>
  )
}

function SectionDot({ label, filled }: { label: string; filled: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${filled ? 'text-[#1D9E75]' : 'text-gray-400'}`}>
      <span className={`h-2 w-2 rounded-full ${filled ? 'bg-[#1D9E75]' : 'bg-gray-200'}`} />
      {label}
    </span>
  )
}

function Drawer({ proposal: p, onClose }: { proposal: TrackedProposal; onClose: () => void }) {
  const followUp = suggestFollowUp(p)
  const waUrl = p.client_phone ? `https://wa.me/${p.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(followUp.message)}` : '#'
  const mailUrl = p.client_email ? `mailto:${p.client_email}?subject=${encodeURIComponent(followUp.subject ?? '')}&body=${encodeURIComponent(followUp.message)}` : '#'

  function copyMessage() {
    navigator.clipboard?.writeText(followUp.message)
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Detalle de seguimiento</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900">{p.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{p.client_name}</p>
            <div className="mt-3"><IntentionBadge score={p.intention_score} /></div>
          </div>

          <Link href={p.share_url} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <ExternalLink className="h-3.5 w-3.5" /> Ver propuesta pública
          </Link>

          {/* Timeline mock */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Línea de tiempo</h4>
            <div className="space-y-3">
              {p.opened_at ? (
                <>
                  <TimelineItem time={p.opened_at} text={`Abrió la propuesta · ${p.client_name}`} type="info" />
                  {p.view_count > 1 && (
                    <TimelineItem time={p.last_viewed_at!} text={`Volvió a abrir (apertura #${p.view_count})`} type="warning" />
                  )}
                  {p.sections_viewed.pricing && (
                    <TimelineItem time={p.last_viewed_at!} text="Vio sección Inversión" type="success" />
                  )}
                  {p.sections_viewed.cases && (
                    <TimelineItem time={p.last_viewed_at!} text="Vio Casos de éxito" type="info" />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">El cliente aún no ha abierto la propuesta.</p>
              )}
            </div>
          </div>

          {/* Suggested follow-up */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Follow-up sugerido por IA</h4>
            <p className="text-xs text-gray-500 mb-3">{followUp.reasoning}</p>
            <div className="bg-[#e6f7f2] border border-[#1D9E75]/20 rounded-xl p-4">
              {followUp.subject && (
                <p className="text-xs font-semibold text-gray-700 mb-2">Asunto: <span className="font-normal text-gray-600">{followUp.subject}</span></p>
              )}
              <p className="text-sm text-gray-800">{followUp.message}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={copyMessage} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50">
                <Copy className="h-3.5 w-3.5" /> Copiar
              </button>
              {p.client_phone && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#25D366]/10 text-[#0d6c40] border border-[#25D366]/30 rounded-lg text-xs font-medium hover:bg-[#25D366]/20">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
              {p.client_email && (
                <a href={mailUrl} className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100">
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ time, text, type }: { time: string; text: string; type: 'info' | 'success' | 'warning' }) {
  const colors = {
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
  }
  return (
    <div className="flex items-start gap-3">
      <div className={`h-6 w-6 rounded-full ${colors[type]} flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5`}>•</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{text}</p>
        <p className="text-xs text-gray-500">{formatDateRelative(time)}</p>
      </div>
    </div>
  )
}
