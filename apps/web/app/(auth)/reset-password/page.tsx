'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordsMatch = password === confirmPassword
  const passwordValid = password.length >= 6
  const isValid = passwordValid && passwordsMatch && password.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isValid) {
      setError('Verifica que las contraseñas sean válidas y coincidan')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('Error al actualizar la contraseña. Intenta nuevamente.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    setTimeout(() => {
      router.push('/sign-in')
      router.refresh()
    }, 2000)
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
            Elige una nueva{' '}
            <span className="text-[#1D9E75]">contraseña segura</span>
          </h2>
          <p className="text-[#94A3B8] text-sm leading-relaxed">
            Crea una contraseña fuerte para proteger tu cuenta y acceso a propuestas.
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
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Restaurar contraseña</h1>
            <p className="text-sm text-gray-500">Ingresa tu nueva contraseña para acceder a tu cuenta</p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
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
                {password.length > 0 && (
                  <p className={`text-xs mt-1 ${passwordValid ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordValid ? '✓ Contraseña válida' : 'Mínimo 6 caracteres requeridos'}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repite tu contraseña"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-xs mt-1 ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? '✓ Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full py-2.5 rounded-xl bg-[#1D9E75] hover:bg-[#158a63] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {loading ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-50 rounded-full p-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Contraseña actualizada</h2>
                <p className="text-sm text-gray-500">Tu nueva contraseña ha sido establecida correctamente.</p>
              </div>
              <p className="text-xs text-gray-400">Redirigiendo a inicio de sesión en unos momentos...</p>
              <Link
                href="/sign-in"
                className="inline-block w-full py-2.5 rounded-xl bg-[#1D9E75] hover:bg-[#158a63] text-white text-sm font-semibold transition-colors"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
