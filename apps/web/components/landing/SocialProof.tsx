const INDUSTRIES = [
  'Tecnología', 'Retail', 'Salud', 'Educación',
  'Finanzas', 'Logística', 'Manufactura', 'Consultoría',
]

export function SocialProof() {
  return (
    <section className="py-12 bg-gray-50 border-y border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-center text-sm text-gray-400 mb-8 font-medium uppercase tracking-widest">
          Utilizado por equipos de ventas en toda LATAM
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {INDUSTRIES.map((industry) => (
            <div
              key={industry}
              className="px-5 py-2.5 bg-white border border-gray-100 rounded-full text-sm text-gray-400 font-medium shadow-sm"
            >
              {industry}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
