'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TRUST_ITEMS = [
  'Sin tarjeta de crédito — 30 días gratis',
  'Añade tarjeta después para +30 días',
  'Genera propuestas multi-servicio con IA',
  'Exporta en PDF y Word al instante',
]

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message === 'User already registered'
        ? 'Ya existe una cuenta con ese correo. ¿Quieres iniciar sesión?'
        : authError.message)
      setLoading(false)
      return
    }

    setEmailSent(true)
    setLoading(false)
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
    }
    setGoogleLoading(false)
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-[#1D9E75]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-[#1D9E75]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Revisa tu correo</h1>
          <p className="text-gray-500 text-sm mb-6">
            Te enviamos un enlace de confirmación a{' '}
            <span className="font-medium text-gray-700">{email}</span>.
            Haz clic en él para activar tu cuenta.
          </p>
          <Link href="/sign-in" className="text-[#1D9E75] text-sm font-semibold hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] bg-[#0F172A] p-10">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-16">
            <Zap className="h-6 w-6 text-[#1D9E75]" />
            <span className="font-bold text-white text-lg tracking-tight">
              Smart<span className="text-[#1D9E75]">SPG</span>
            </span>
          </Link>

          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Empieza a generar propuestas{' '}
            <span className="text-[#1D9E75]">en 2 minutos</span>
          </h2>
          <p className="text-[#94A3B8] text-sm leading-relaxed mb-10">
            Crea tu cuenta, responde unas preguntas sobre tu negocio y
            la IA personalizará tus propuestas desde el primer día.
          </p>

          <div className="space-y-4">
            {TRUST_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#1D9E75] flex-shrink-0" />
                <span className="text-white text-sm">{item}</span>
              </div>
            ))}
          </div>
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
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Crea tu cuenta</h1>
            <p className="text-sm text-gray-500">30 días gratis — sin compromiso ni tarjeta</p>
          </div>

          <button
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full py-2.5 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-gray-300 disabled:opacity-60 text-gray-700 text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Conectando…' : 'Registrarse con Google'}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o regístrate con correo</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
              {loading ? 'Creando cuenta…' : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/sign-in" className="text-[#1D9E75] font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
