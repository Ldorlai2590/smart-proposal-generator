'use client'

import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, User, Globe, DollarSign, LogOut, KeyRound, Save, Check, Eye, Sparkles } from 'lucide-react'
import { isEmptyState, setEmptyState } from '@/lib/demo-mode'



type Currency = 'USD' | 'CLP'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
  )
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export default function SettingsPage() {
  const [userName, setUserName] = useState<string | null>(null)
  const [editedName, setEditedName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>('CLP')
  const [saved, setSaved] = useState(false)
  const [emptyMode, setEmptyModeState] = useState(false)

  useEffect(() => {
    const stored = getCookie('spg-currency') as Currency | null
    if (stored === 'USD' || stored === 'CLP') {
      setCurrency(stored)
    }
    setEmptyModeState(isEmptyState())
  }, [])

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setUserName(data.user.name)
          setEditedName(data.user.name ?? '')
          setUserEmail(data.user.email)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveName() {
    if (!editedName.trim() || editedName === userName) return
    setSavingName(true)
    setNameSaved(false)
    setSaveError(null)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim() }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setUserName(editedName.trim())
      setNameSaved(true)
      window.setTimeout(() => setNameSaved(false), 2000)
    } catch (err) {
      console.error(err)
      setSaveError('No se pudo guardar el nombre. Intenta de nuevo.')
    } finally {
      setSavingName(false)
    }
  }

  function handleCurrencyChange(next: Currency) {
    setCurrency(next)
    setCookie('spg-currency', next)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/sign-in'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#e6f7f2] flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-[#1D9E75]" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ajusta tu perfil, preferencias y sesión.
          </p>
        </div>
      </div>

      {/* Perfil */}
      <section
        aria-labelledby="settings-profile"
        className="rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        <header className="p-5 border-b border-gray-100 flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 id="settings-profile" className="text-sm font-semibold text-gray-900">
            Perfil
          </h2>
        </header>
        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="name-input" className="block text-xs font-medium text-gray-500 mb-1">
              Nombre
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="name-input"
                type="text"
                value={loading ? '' : editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder={loading ? 'Cargando…' : 'Tu nombre completo'}
                disabled={loading || savingName}
                maxLength={120}
                className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 focus:border-[#1D9E75] disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={loading || savingName || !editedName.trim() || editedName === userName}
                className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#1D9E75] text-white hover:bg-[#158a63]"
              >
                {savingName ? (
                  'Guardando…'
                ) : nameSaved ? (
                  <><Check className="h-3.5 w-3.5" /> Guardado</>
                ) : (
                  <><Save className="h-3.5 w-3.5" /> Guardar</>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Este nombre aparecerá en el sidebar y en las propuestas que generes.
            </p>
            {saveError && (
              <p className="text-xs text-red-500 mt-1.5" role="alert">{saveError}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Email
            </label>
            <input
              type="email"
              readOnly
              value={loading ? 'Cargando…' : userEmail ?? '—'}
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none"
              aria-readonly="true"
            />
          </div>
        </div>
      </section>

      {/* Preferencias */}
      <section
        aria-labelledby="settings-prefs"
        className="rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        <header className="p-5 border-b border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <h2 id="settings-prefs" className="text-sm font-semibold text-gray-900">
              Preferencias
            </h2>
          </div>
          {saved && (
            <span
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-[#1D9E75]"
            >
              Guardado
            </span>
          )}
        </header>
        <div className="p-5 space-y-5">
          <div>
            <label
              htmlFor="currency-select"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5"
            >
              <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
              Moneda
            </label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
              className="w-full sm:w-60 h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
            >
              <option value="CLP">CLP — Peso chileno</option>
              <option value="USD">USD — Dólar</option>
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              Afecta el formato de valores en propuestas y reportes.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Idioma
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="Español (Chile)"
                className="w-full sm:w-60 h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 focus:outline-none"
                aria-readonly="true"
              />
              <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                Fijo
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Datos de ejemplo */}
      <section
        aria-labelledby="settings-demo"
        className="rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        <header className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 id="settings-demo" className="text-sm font-semibold text-gray-900">
            Datos de ejemplo
          </h2>
        </header>
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {emptyMode ? 'Modo limpio activado' : 'Mostrar datos de ejemplo'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {emptyMode
                  ? 'Estás viendo la app sin datos preseteados (modo limpio).'
                  : 'Estás viendo Andes Digital, 8 servicios, 6 propuestas tracked y 5 clientes de ejemplo.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEmptyState(!emptyMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                !emptyMode ? 'bg-[#1D9E75]' : 'bg-gray-300'
              }`}
              aria-label={emptyMode ? 'Activar datos de ejemplo' : 'Ocultar datos de ejemplo'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  !emptyMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {!emptyMode && (
            <button
              type="button"
              onClick={() => setEmptyState(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1D9E75] bg-[#1D9E75]/10 rounded-lg hover:bg-[#1D9E75]/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> Empezar limpio ahora
            </button>
          )}
        </div>
      </section>

      {/* Sesión */}
      <section
        aria-labelledby="settings-session"
        className="rounded-2xl border border-gray-100 bg-white shadow-sm"
      >
        <header className="p-5 border-b border-gray-100 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 id="settings-session" className="text-sm font-semibold text-gray-900">
            Sesión
          </h2>
        </header>
        <div className="p-5 space-y-3">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed"
            title="Próximamente disponible"
          >
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Cambiar contraseña (próximamente)
          </button>
          <div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
