'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Plus, Search, MoreHorizontal, Eye, Copy, Archive, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Proposal {
  id: string
  title: string
  client: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  value: string
  date: string
}

const MOCK_PROPOSALS: Proposal[] = [
  { id: '1', title: 'Plataforma e-commerce B2B', client: 'TechCorp SA', status: 'accepted', value: '$12,000', date: '06/04/2026' },
  { id: '2', title: 'Consultoría transformación digital', client: 'Retail Plus', status: 'sent', value: '$8,500', date: '05/04/2026' },
  { id: '3', title: 'Migración cloud AWS', client: 'HealthMed', status: 'draft', value: '$24,000', date: '04/04/2026' },
  { id: '4', title: 'App móvil iOS + Android', client: 'EduTech', status: 'rejected', value: '$18,000', date: '03/04/2026' },
  { id: '5', title: 'CRM personalizado', client: 'FinCorp', status: 'sent', value: '$31,000', date: '02/04/2026' },
  { id: '6', title: 'Sistema de logística', client: 'LogiPro', status: 'accepted', value: '$45,000', date: '01/04/2026' },
  { id: '7', title: 'Rediseño UX/UI', client: 'CreativeCo', status: 'draft', value: '$6,000', date: '31/03/2026' },
]

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

export default function ProposalsPage() {
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

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
    let data = MOCK_PROPOSALS
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
  }, [globalFilter, statusFilter])

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

      {/* Table */}
      {filteredData.length === 0 ? (
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
      ) : (
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
