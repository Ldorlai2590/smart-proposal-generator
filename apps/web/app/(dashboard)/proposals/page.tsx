'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Plus, Search, MoreHorizontal, Eye, Copy, Archive, Trash2, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { fetchWithTenant } from '@/lib/api'

interface Proposal {
  id: string
  title: string
  client: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  value: string
  date: string
}

// Raw shape returned by FastAPI
interface ApiProposal {
  id: string
  title: string
  status: string
  client_id: string
  created_at: string
  context: { budget?: number }
}

interface ApiResponse {
  data: ApiProposal[]
  total: number
}

function formatBudget(budget?: number): string {
  if (budget == null) return '—'
  return `$${budget.toLocaleString('en-US')}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function mapApiProposal(p: ApiProposal): Proposal {
  const validStatuses = new Set<Proposal['status']>(['draft', 'sent', 'accepted', 'rejected'])
  const status: Proposal['status'] = validStatuses.has(p.status as Proposal['status'])
    ? (p.status as Proposal['status'])
    : 'draft'
  return {
    id: p.id,
    title: p.title ?? 'Sin título',
    client: p.client_id,
    status,
    value: formatBudget(p.context?.budget),
    date: formatDate(p.created_at),
  }
}

const STATUS_STYLES: Record<Proposal['status'], string> = {
  accepted: 'bg-green-50 text-green-700',
  sent: 'bg-blue-50 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-50 text-red-500',
}

const STATUS_LABELS: Record<Proposal['status'], string> = {
  accepted: 'Aceptada',
  sent: 'Enviada',
  draft: 'Borrador',
  rejected: 'Rechazada',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'draft', label: 'Borradores' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
]

// Skeleton row — 5 cells matching the table columns
function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          {/* Propuesta (title + client) */}
          <td className="px-5 py-3.5">
            <div className="h-3.5 w-48 bg-gray-200 rounded animate-pulse mb-1.5" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          </td>
          {/* Estado */}
          <td className="px-5 py-3.5">
            <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
          </td>
          {/* Valor */}
          <td className="px-5 py-3.5">
            <div className="h-3.5 w-16 bg-gray-200 rounded animate-pulse" />
          </td>
          {/* Fecha */}
          <td className="px-5 py-3.5">
            <div className="h-3.5 w-20 bg-gray-200 rounded animate-pulse" />
          </td>
          {/* Acciones */}
          <td className="px-5 py-3.5">
            <div className="h-6 w-6 bg-gray-100 rounded animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  )
}

export default function ProposalsPage() {
  const { orgId } = useAuth()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchProposals = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/proposals')
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`)
      }
      const json: ApiResponse = await res.json()
      setProposals(json.data.map(mapApiProposal))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propuestas')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const columns = useMemo<ColumnDef<Proposal>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Propuesta',
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium text-gray-900">{row.original.title}</p>
            <p className="text-xs text-gray-400">{row.original.client}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => (
          <span
            className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full',
              STATUS_STYLES[row.original.status],
            )}
          >
            {STATUS_LABELS[row.original.status]}
          </span>
        ),
      },
      {
        accessorKey: 'value',
        header: 'Valor',
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-gray-900">{row.original.value}</span>
        ),
      },
      {
        accessorKey: 'date',
        header: 'Fecha',
        cell: ({ row }) => (
          <span className="text-sm text-gray-400">{row.original.date}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: () => (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="gap-2 text-sm">
                <Eye className="h-3.5 w-3.5" /> Ver
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm">
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm">
                <Archive className="h-3.5 w-3.5" /> Archivar
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm text-red-500">
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  )

  const filteredData = useMemo(() => {
    let data = proposals
    if (statusFilter) data = data.filter((p) => p.status === statusFilter)
    if (globalFilter) {
      const q = globalFilter.toLowerCase()
      data = data.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q),
      )
    }
    return data
  }, [proposals, globalFilter, statusFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propuestas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona todas tus propuestas comerciales.</p>
        </div>
        <Link
          href="/proposals/new"
          className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva propuesta
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Buscar propuestas..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>
        <select
          className="h-9 text-sm border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchProposals}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Propuesta', 'Estado', 'Valor', 'Fecha', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SkeletonRows count={5} />
            </tbody>
          </table>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filteredData.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Sin propuestas</h3>
          <p className="text-sm text-gray-400 mb-5">
            {globalFilter || statusFilter
              ? 'No hay propuestas con esos filtros.'
              : 'Crea tu primera propuesta con IA en minutos.'}
          </p>
          <Link
            href="/proposals/new"
            className="inline-flex items-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#158a63] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear propuesta
          </Link>
        </div>
      )}

      {!loading && !error && filteredData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-100">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3.5"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-gray-50 hover:bg-gray-50 transition-colors',
                    i === table.getRowModel().rows.length - 1 && 'border-b-0',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {filteredData.length} propuesta{filteredData.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
