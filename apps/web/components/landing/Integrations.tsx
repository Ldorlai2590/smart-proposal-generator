const INTEGRATIONS = [
  { name: 'Anthropic Claude', letter: 'A' },
  { name: 'Clerk Auth', letter: 'C' },
  { name: 'Stripe', letter: 'S' },
  { name: 'Supabase', letter: 'SB' },
  { name: 'Upstash', letter: 'U' },
  { name: 'Resend', letter: 'R' },
  { name: 'DocuForge', letter: 'D' },
]

export function Integrations() {
  return (
    <section id="integrations" className="py-20 bg-[#0F172A]">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">
          Construido con las mejores herramientas
        </h2>
        <p className="text-[#94A3B8] text-lg mb-12">
          Infraestructura enterprise, lista para producción desde el día uno.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-3 bg-[#1E293B] border border-[#334155] rounded-xl px-5 py-3"
            >
              <div className="h-7 w-7 rounded-md bg-[#334155] flex items-center justify-center text-xs font-bold text-white">
                {integration.letter}
              </div>
              <span className="text-sm text-[#94A3B8] font-medium">{integration.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
