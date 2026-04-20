import Link from 'next/link'
import { Zap, Home, LayoutDashboard } from 'lucide-react'

export const metadata = {
  title: 'Página no encontrada · SmartSPG',
  description: 'La página que buscas no existe en SmartSPG.',
}

export default function NotFound() {
  return (
    <main
      role="main"
      className="min-h-screen bg-[#0F172A] text-[#F8FAFC] flex items-center justify-center px-6"
    >
      <div className="max-w-lg w-full text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Zap className="h-6 w-6 text-[#1D9E75]" aria-hidden="true" />
          <span className="font-bold text-xl tracking-tight">
            Smart<span className="text-[#1D9E75]">SPG</span>
          </span>
        </div>

        {/* 404 display */}
        <p
          aria-hidden="true"
          className="text-[7rem] sm:text-[9rem] font-black leading-none tracking-tighter text-[#1D9E75] select-none"
          style={{ textShadow: '0 0 60px rgba(29, 158, 117, 0.25)' }}
        >
          404
        </p>

        <h1 className="text-2xl sm:text-3xl font-bold mt-2 mb-3">
          Página no encontrada
        </h1>
        <p className="text-sm sm:text-base text-[#94A3B8] mb-10 max-w-md mx-auto">
          Parece que esta ruta no existe en SmartSPG. Puede que hayas seguido un
          enlace caducado o escrito una URL incorrecta.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-[#1D9E75] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#158a63] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Ir al dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border border-[#1E293B] bg-[#1E293B]/40 text-[#F8FAFC] text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#1E293B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ver página principal
          </Link>
        </div>
      </div>
    </main>
  )
}
