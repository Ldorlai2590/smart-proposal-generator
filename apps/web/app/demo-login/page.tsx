'use client'

import { useState } from 'react'
import { Zap, AlertCircle, Loader2 } from 'lucide-react'

const DEMO_EMAIL = 'demo@smartspg.com'

export default function DemoLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al iniciar sesión')
        setLoading(false)
        return
      }

      // Hard navigation to ensure middleware re-runs and session cookie is read
      window.location.href = '/dashboard'
    } catch (err) {
      console.error(err)
      setError('No se pudo conectar. Intenta de nuevo.')
      setLoading(false)
    }
  }

  // Pre-fill the email field with the demo address. No password is ever
  // hard-coded into the client bundle — the user types their own.
  function handleQuickDemo() {
    setEmail(DEMO_EMAIL)
    setError(null)
    // Move focus to the password field so the user can keep typing.
    const pwInput = document.getElementById('password') as HTMLInputElement | null
    pwInput?.focus()
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#1D9E75]/10 mb-4">
            <Zap className="h-7 w-7 text-[#1D9E75]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Smart<span className="text-[#1D9E75]">SPG</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Generador inteligente de propuestas
          </p>
        </div>

        {/* Login card */}
        <div className="bg-[#1E293B] rounded-2xl border border-[#334155] p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-1">
            Iniciar sesión
          </h2>
          <p className="text-sm text-[#94A3B8] mb-6">
            Ingresa tus credenciales para continuar
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#94A3B8] mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-white text-sm placeholder:text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#94A3B8] mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-white text-sm placeholder:text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1D9E75] hover:bg-[#158a63] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#334155]" />
            <span className="text-xs text-[#475569]">o acceso rápido</span>
            <div className="flex-1 h-px bg-[#334155]" />
          </div>

          {/* Quick demo button */}
          <button
            onClick={handleQuickDemo}
            disabled={loading}
            type="button"
            className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#1a2744] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4 text-[#1D9E75]" />
            Usar correo demo
          </button>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-[#475569] mt-6">
          Sesión segura con JWT · Expira en 7 días
        </p>
      </div>
    </div>
  )
}
