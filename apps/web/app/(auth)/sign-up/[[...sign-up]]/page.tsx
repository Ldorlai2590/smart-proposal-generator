import { SignUp } from '@clerk/nextjs'
import { Zap, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const TRUST_ITEMS = [
  'Sin tarjeta de crédito — 30 días gratis',
  'Añade tarjeta después para +30 días',
  'Genera propuestas multi-servicio con IA',
  'Exporta en PDF y Word al instante',
]

export default function SignUpPage() {
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

      {/* Right panel — Clerk sign up */}
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
            <p className="text-sm text-gray-500">
              60 días gratis — sin compromiso ni tarjeta
            </p>
          </div>

          <SignUp
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
