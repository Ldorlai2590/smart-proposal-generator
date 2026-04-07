import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTAFinal() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto bg-gradient-to-br from-[#1D9E75] to-[#158a63] rounded-3xl p-12 text-center shadow-2xl shadow-[#1D9E75]/20">
        <h2 className="text-3xl font-bold text-white mb-4">
          ¿Listo para cerrar más ventas?
        </h2>
        <p className="text-[#e6f7f2] text-lg mb-8 max-w-xl mx-auto">
          Únete a los equipos de ventas que ya usan SmartSPG para ganar más propuestas en menos tiempo.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 bg-white text-[#1D9E75] font-bold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          Empezar gratis hoy
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-[#e6f7f2]/70 text-xs mt-4">
          Sin tarjeta de crédito · 3 propuestas gratis · Cancela cuando quieras
        </p>
      </div>
    </section>
  )
}
