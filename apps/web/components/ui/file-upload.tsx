'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, FileText, Image as ImageIcon, X, CheckCircle2, AlertCircle } from 'lucide-react'

export interface UploadedFile {
  name: string
  size: number
  type: string
  url?: string  // base64 preview or remote URL
  uploadedAt: string
}

interface FileUploadProps {
  /** Existing file (for edit mode) */
  value?: UploadedFile | null
  /** Called when file changes (after upload completes) */
  onChange: (file: UploadedFile | null) => void
  /** MIME types accepted */
  accept?: string
  /** Max size in MB */
  maxSizeMB?: number
  /** Friendly label */
  label?: string
  /** Description hint shown in dropzone */
  hint?: string
  /** Variant */
  variant?: 'pdf' | 'image' | 'any'
  /** Compact (single row) vs default (large dropzone) */
  compact?: boolean
}

const VARIANT_DEFAULTS: Record<string, { accept: string; hint: string; icon: typeof FileText }> = {
  pdf: {
    accept: 'application/pdf',
    hint: 'PDF — máx 10MB',
    icon: FileText,
  },
  image: {
    accept: 'image/png,image/jpeg,image/svg+xml,image/webp',
    hint: 'PNG, JPG, SVG, WEBP — máx 5MB',
    icon: ImageIcon,
  },
  any: {
    accept: '*/*',
    hint: 'Cualquier archivo — máx 10MB',
    icon: FileText,
  },
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  value,
  onChange,
  accept,
  maxSizeMB,
  label,
  hint,
  variant = 'any',
  compact = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaults = VARIANT_DEFAULTS[variant] ?? VARIANT_DEFAULTS.any
  const finalAccept = accept ?? defaults.accept
  const finalMaxMB = maxSizeMB ?? (variant === 'pdf' ? 10 : variant === 'image' ? 5 : 10)
  const finalHint = hint ?? defaults.hint
  const Icon = defaults.icon

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      // Size check
      const maxBytes = finalMaxMB * 1024 * 1024
      if (file.size > maxBytes) {
        setError(`Archivo muy grande. Máximo ${finalMaxMB}MB.`)
        return
      }

      // Type check (loose match)
      if (finalAccept !== '*/*') {
        const acceptList = finalAccept.split(',').map((s) => s.trim())
        const matches = acceptList.some((a) => {
          if (a.endsWith('/*')) return file.type.startsWith(a.replace('/*', ''))
          return file.type === a
        })
        if (!matches) {
          setError('Tipo de archivo no permitido.')
          return
        }
      }

      setUploading(true)

      // Read as base64 for local preview (demo mode).
      // En producción esto subiría a Supabase Storage.
      const reader = new FileReader()
      reader.onload = () => {
        onChange({
          name: file.name,
          size: file.size,
          type: file.type,
          url: typeof reader.result === 'string' ? reader.result : undefined,
          uploadedAt: new Date().toISOString(),
        })
        setUploading(false)
      }
      reader.onerror = () => {
        setError('Error al leer el archivo.')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    },
    [finalAccept, finalMaxMB, onChange],
  )

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    onChange(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ─── Uploaded file preview ────────────────────────────────────────────────
  if (value) {
    return (
      <div className="space-y-2">
        {label && <label className="block text-xs font-medium text-gray-600">{label}</label>}
        <div className="flex items-center gap-3 p-3 bg-[#e6f7f2] border border-[#1D9E75]/30 rounded-xl">
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
            {value.type.startsWith('image/') && value.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.url} alt={value.name} className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-5 w-5 text-[#1D9E75]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{value.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <CheckCircle2 className="h-3 w-3 text-[#1D9E75]" />
              <p className="text-xs text-gray-600">{formatSize(value.size)} · subido</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
            aria-label="Eliminar archivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // ─── Compact variant (used inside accordions) ─────────────────────────────
  if (compact) {
    return (
      <div className="space-y-2">
        {label && <label className="block text-xs font-medium text-gray-600">{label}</label>}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#1D9E75] hover:bg-[#1D9E75]/5 transition-colors"
        >
          <Upload className="h-4 w-4 text-gray-400" />
          <span>{uploading ? 'Subiendo…' : 'Subir archivo'}</span>
          <span className="ml-auto text-xs text-gray-400">{finalHint}</span>
        </button>
        {error && (
          <p className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={finalAccept}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    )
  }

  // ─── Default dropzone variant ─────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-gray-600">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[#1D9E75] bg-[#1D9E75]/10'
            : 'border-gray-200 hover:border-[#1D9E75] hover:bg-gray-50'
        }`}
      >
        <Icon className={`h-8 w-8 mx-auto mb-2 ${dragOver ? 'text-[#1D9E75]' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-700 font-medium">
          {uploading ? 'Subiendo…' : dragOver ? 'Suelta el archivo aquí' : 'Arrastra tu archivo o haz click'}
        </p>
        <p className="text-xs text-gray-400 mt-1">{finalHint}</p>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={finalAccept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
