import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTAFinal() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto bg-gradient-to-br from-[#1D9E75] to-[#158a63] rounded-3xl p-12 text-center shadow-2xl shadow-[#1D9E75]/20">
        <h2 className="text-3xl font-bold text-white mb-4">
          Tu competencia ya usa IA. ¿Tú sigues en Word?
        </h2>
        <p className="text-[#e6f7f2] text-lg mb-2 max-w-xl mx-auto">
          Únete a +120 equipos en Chile, México y Colombia que cierran más rápido con SmartSPG.
        </p>
        <p className="text-[#e6f7f2]/80 text-sm mb-8 max-w-lg mx-auto">
          Si en 30 días no cierras propuestas más rápido, cancelas sin costo. Sin preguntas.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 bg-white text-[#1D9E75] font-bold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          Empezar gratis ahora
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-[#e6f7f2]/70 text-xs mt-4">
          30 días gratis · Sin tarjeta · Cancela en 1 clic
        </p>
      </div>
    </section>
  )
}
