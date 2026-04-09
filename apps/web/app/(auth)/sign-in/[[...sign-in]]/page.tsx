import { SignIn } from '@clerk/nextjs'
import { Zap, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const TRUST_ITEMS = [
  '60 días de prueba gratis',
  'Propuestas multi-servicio con IA',
  'Export PDF y Word en segundos',
]

export default function SignInPage() {
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
            Propuestas B2B profesionales,{' '}
            <span className="text-[#1D9E75]">generadas con IA</span>
          </h2>
          <p className="text-[#94A3B8] text-sm leading-relaxed mb-10">
            Crea propuestas comerciales multi-servicio en minutos.
            Analiza a tu cliente, personaliza con IA y exporta en PDF o Word.
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

      {/* Right panel — Clerk sign in */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] px-6">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Zap className="h-5 w-5 text-[#1D9E75]" />
          <span className="font-bold text-gray-900 text-lg">
            Smart<span className="text-[#1D9E75]">SPG</span>
          </span>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido de vuelta</h1>
            <p className="text-sm text-gray-500">
              Inicia sesión para continuar con tus propuestas
            </p>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0 p-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton:
                  'border border-gray-200 hover:bg-gray-50 transition-colors rounded-xl',
                formButtonPrimary:
                  'bg-[#1D9E75] hover:bg-[#158a63] rounded-xl text-sm font-semibold',
                formFieldInput:
                  'rounded-xl border-gray-200 focus:ring-[#1D9E75] focus:border-[#1D9E75]',
                footerActionLink: 'text-[#1D9E75] hover:text-[#158a63]',
              },
            }}
          />

          <p className="text-center text-xs text-gray-400 mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/sign-up" className="text-[#1D9E75] font-semibold hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
