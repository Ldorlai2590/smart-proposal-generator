'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ClientData } from './Step1Client'

export interface ContextData {
  problema: string
  services: string[]
  budget: string
  timeline: string
  template: string
  tono: 'formal' | 'consultivo' | 'directo'
}

interface Step2ContextProps {
  client: ClientData
  onNext: (data: ContextData) => void
  onBack: () => void
}

const TEMPLATES = [
  { id: 'software', label: 'Desarrollo Software', icon: '💻', desc: 'Apps, plataformas, integraciones' },
  { id: 'consultoria', label: 'Consultoría', icon: '🎯', desc: 'Estrategia, procesos, transformación' },
  { id: 'marketing', label: 'Marketing Digital', icon: '📱', desc: 'SEO, paid media, contenido' },
  { id: 'infraestructura', label: 'Infraestructura', icon: '☁️', desc: 'Cloud, DevOps, seguridad' },
  { id: 'capacitacion', label: 'Capacitación', icon: '🎓', desc: 'Formación, workshops, cursos' },
  { id: 'general', label: 'Propuesta General', icon: '📄', desc: 'Adaptable a cualquier servicio' },
]

const SERVICES = [
  { id: 'consultoria', label: 'Consultoría estratégica', icon: '🎯' },
  { id: 'desarrollo-web', label: 'Desarrollo web / Landing page', icon: '💻' },
  { id: 'marketing-digital', label: 'Marketing digital / Paid Media', icon: '📱' },
  { id: 'diseño-contenido', label: 'Diseño y creación de contenido', icon: '🎨' },
  { id: 'seo-sem', label: 'SEO / SEM', icon: '🔍' },
  { id: 'email-marketing', label: 'Email marketing', icon: '📧' },
  { id: 'capacitacion', label: 'Capacitación / Training', icon: '🎓' },
  { id: 'otro', label: 'Otro (custom)', icon: '⚙️' },
]

const BUDGETS = ['< $5K', '$5K - $20K', '$20K - $50K', '$50K - $100K', '$100K+']
const TIMELINES = ['2 semanas', '1 mes', '2-3 meses', '3-6 meses', '6+ meses']
const TONOS = [
  { id: 'consultivo' as const, label: 'Consultivo', desc: 'Cercano, asesor de confianza' },
  { id: 'formal' as const, label: 'Formal', desc: 'Profesional, corporativo' },
  { id: 'directo' as const, label: 'Directo', desc: 'Concreto, orientado a resultados' },
]

export function Step2Context({ client, onNext, onBack }: Step2ContextProps) {
  const [problema, setProblema] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')
  const [template, setTemplate] = useState('')
  const [tono, setTono] = useState<'formal' | 'consultivo' | 'directo'>('consultivo')
  const [customService, setCustomService] = useState('')

  const toggleService = (serviceId: string) => {
    if (serviceId === 'otro') {
      setServices(services.includes(serviceId) ? services.filter(s => s !== serviceId) : [...services, serviceId])
    } else {
      setServices(services.includes(serviceId) ? services.filter(s => s !== serviceId) : [...services, serviceId])
    }
  }

  const servicesWithCustom = customService && services.includes('otro')
    ? services.filter(s => s !== 'otro').concat([customService])
    : services

  const canContinue = problema.trim().length >= 20 && template !== '' && services.length > 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Problema a resolver *
        </label>
        <Textarea
          placeholder={`¿Cuál es el principal desafío de ${client.company} que quieres abordar?`}
          value={problema}
          onChange={(e) => setProblema(e.target.value)}
          className="min-h-[100px]"
          autoFocus
        />
        <p className={cn(
          'text-xs text-right transition-colors',
          problema.length < 20 ? 'text-gray-400' : 'text-[var(--color-brand)]'
        )}>
          {problema.length} / 20 mínimo
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Servicios a incluir *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.map((service) => (
            <div key={service.id}>
              <button
                onClick={() => toggleService(service.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left',
                  services.includes(service.id)
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                    : 'border-gray-200 hover:border-gray-300',
                )}
              >
                <span className="text-base">{service.icon}</span>
                <span className="font-medium text-gray-900">{service.label}</span>
              </button>
              {service.id === 'otro' && services.includes('otro') && (
                <input
                  type="text"
                  placeholder="Describe el servicio personalizado"
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  className="w-full mt-1.5 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--color-brand)]"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Template base *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all',
                template === t.id
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                  : 'border-gray-100 hover:border-gray-200',
              )}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-sm font-medium text-gray-900">{t.label}</span>
              <span className="text-xs text-gray-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Presupuesto estimado
          </label>
          <div className="flex flex-wrap gap-1.5">
            {BUDGETS.map((b) => (
              <button
                key={b}
                onClick={() => setBudget(budget === b ? '' : b)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                  budget === b
                    ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                    : 'border-gray-200 text-gray-600 hover:border-[var(--color-brand)]',
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Timeline deseado
          </label>
          <div className="flex flex-wrap gap-1.5">
            {TIMELINES.map((t) => (
              <button
                key={t}
                onClick={() => setTimeline(timeline === t ? '' : t)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs border transition-colors',
                  timeline === t
                    ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]'
                    : 'border-gray-200 text-gray-600 hover:border-[var(--color-brand)]',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tono</label>
        <div className="flex gap-2">
          {TONOS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTono(t.id)}
              className={cn(
                'flex-1 py-2.5 rounded-xl border text-center transition-all',
                tono === t.id
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                  : 'border-gray-100 hover:border-gray-200',
              )}
            >
              <p className="text-sm font-medium text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} size="lg">
          Atrás
        </Button>
        <Button onClick={() => onNext({ problema, services: servicesWithCustom, budget, timeline, template, tono })} disabled={!canContinue} size="lg" className="flex-1">
          Generar propuesta →
        </Button>
      </div>
    </div>
  )
}
