import { Mail, MessageSquare, Users, Briefcase, Phone, Layers } from 'lucide-react'

type Integration = {
  name: string
  icon: typeof Mail
  status: 'available' | 'soon'
}

const INTEGRATIONS: Integration[] = [
  { name: 'Gmail / Outlook', icon: Mail, status: 'available' },
  { name: 'HubSpot', icon: Briefcase, status: 'available' },
  { name: 'Salesforce', icon: Briefcase, status: 'soon' },
  { name: 'Pipedrive', icon: Briefcase, status: 'soon' },
  { name: 'Slack / Teams', icon: MessageSquare, status: 'available' },
  { name: 'Google Workspace', icon: Layers, status: 'available' },
  { name: 'WhatsApp Business', icon: Phone, status: 'soon' },
  { name: 'Notion', icon: Users, status: 'soon' },
]

export function Integrations() {
  return (
    <section id="integrations" className="py-20 bg-[#0F172A]">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">
          Se integra con tus herramientas
        </h2>
        <p className="text-[#94A3B8] text-lg mb-12 max-w-xl mx-auto">
          Conecta SmartSPG con el stack que ya usas. Sin migraciones, sin fricción.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {INTEGRATIONS.map((integration) => {
            const Icon = integration.icon
            const soon = integration.status === 'soon'
            return (
              <div
                key={integration.name}
                className={`flex items-center gap-3 rounded-xl px-5 py-3 border ${
                  soon
                    ? 'bg-[#0F172A] border-[#1E293B] opacity-75'
                    : 'bg-[#1E293B] border-[#334155]'
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-md flex items-center justify-center ${
                    soon ? 'bg-[#1E293B]' : 'bg-[#334155]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm text-[#94A3B8] font-medium">{integration.name}</span>
                {soon && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#334155] text-[#94A3B8] px-1.5 py-0.5 rounded">
                    Próximamente
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
