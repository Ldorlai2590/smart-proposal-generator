'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function DemoLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent, overrideEmail?: string) {
    e.preventDefault()
    const finalEmail = overrideEmail ?? email
    if (!finalEmail.trim()) return

    setLoading(true)

    const name = finalEmail.split('@')[0] ?? 'Usuario'
    // Capitalize first letter
    const displayName = name.charAt(0).toUpperCase() + name.slice(1)

    document.cookie = `demo-user-email=${encodeURIComponent(finalEmail)};path=/;max-age=${60 * 60 * 24 * 30}`
    document.cookie = `demo-user-name=${encodeURIComponent(displayName)};path=/;max-age=${60 * 60 * 24 * 30}`

    router.push('/dashboard')
  }

  function handleGoogleLogin(e: React.MouseEvent) {
    e.preventDefault()
    const googleEmail = 'demo@smartspg.com'
    setEmail(googleEmail)
    handleSubmit(e as unknown as React.FormEvent, googleEmail)
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
            Iniciar sesion
          </h2>
          <p className="text-sm text-[#94A3B8] mb-6">
            Ingresa tu correo para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#94A3B8] mb-1.5"
              >
                Correo electronico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                required
                className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-white text-sm placeholder:text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1D9E75] hover:bg-[#158a63] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesion'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#334155]" />
            <span className="text-xs text-[#475569]">o continuar con</span>
            <div className="flex-1 h-px bg-[#334155]" />
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-sm font-medium text-[#F8FAFC] hover:bg-[#1a2744] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Iniciar con Google
          </button>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-[#475569] mt-6">
          Entorno de demostracion &mdash; sin autenticacion real
        </p>
      </div>
    </div>
  )
}
