'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    if (!email) {
      setError('Por favor ingresa tu correo electrónico')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (resetError) {
      setError('Error al enviar el enlace. Intenta nuevamente.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setEmail('')
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-[#0F172A] p-10">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-16">
            <Zap className="h-6 w-6 text-[#1D9E75]" />
            <span className="font-bold text-white text-lg tracking-tight">
              Smart<span className="text-[#1D9E75]">SPG</span>
            </span>
          </Link>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Recupera tu acceso a{' '}
            <span className="text-[#1D9E75]">propuestas profesionales</span>
          </h2>
          <p className="text-[#94A3B8] text-sm leading-relaxed">
            Te ayudaremos a restablecer tu contraseña en unos simples pasos.
          </p>
        </div>

        <div className="text-xs text-[#475569]">
          &copy; {new Date().getFullYear()} Smart Proposal Generator
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] px-6">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Zap className="h-5 w-5 text-[#1D9E75]" />
          <span className="font-bold text-gray-900 text-lg">
            Smart<span className="text-[#1D9E75]">SPG</span>
          </span>
        </div>

        <div className="w-full max-w-[400px]">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a iniciar sesión
          </Link>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">¿Olvidaste tu contraseña?</h1>
            <p className="text-sm text-gray-500">
              Ingresa tu correo y te enviaremos un enlace para recuperar tu cuenta
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@empresa.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] bg-white"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#1D9E75] hover:bg-[#158a63] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {loading ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-sm text-green-800">
                  Te enviamos un enlace de recuperación a <strong>{email}</strong>
                </p>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Revisa tu bandeja de entrada (y spam) en los próximos minutos. El enlace expirará en 1 hora.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="w-full py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-colors"
              >
                Enviar a otro correo
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            ¿Recordaste tu contraseña?{' '}
            <Link href="/sign-in" className="text-[#1D9E75] font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
