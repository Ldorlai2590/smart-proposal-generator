import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mock framer-motion — animated wrappers render as plain divs in jsdom
// ---------------------------------------------------------------------------
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

// ---------------------------------------------------------------------------
// Mock the Vercel AI SDK useObject hook
// The factory function captures the current values of the control variables
// at call time, so tests can update them between renders.
// ---------------------------------------------------------------------------
const mockSubmit = vi.fn()

// Mutable state that each test overrides before rendering
let currentUseObjectReturn: {
  object: Record<string, string> | undefined
  submit: Mock
  isLoading: boolean
  error: Error | undefined
} = {
  object: undefined,
  submit: mockSubmit,
  isLoading: false,
  error: undefined,
}

vi.mock('ai/react', () => ({
  experimental_useObject: vi.fn(() => currentUseObjectReturn),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
import type { ClientData } from '@/components/wizard/Step1Client'
import type { ContextData } from '@/components/wizard/Step2Context'
import { Step3Generate } from '@/components/wizard/Step3Generate'

const mockClient: ClientData = {
  id: 'client-123',
  name: 'María García',
  company: 'Acme Corp',
  industry: 'Tecnología',
  companySize: '50-200',
  score: 85,
}

const mockContext: ContextData = {
  problema: 'Necesitamos automatizar nuestros procesos de ventas.',
  objectives: 'Reducir tiempo de cierre en 40%',
  current_problems: 'Procesos manuales, datos dispersos',
  urgency: 'high',
  budget: '$50.000 USD',
  start_date: '2026-06-01',
  services: [],
  formality: 'ejecutivo',
  tono: 'consultivo',
  design_template: 'premium',
  use_existing: false,
  selected_cases: [],
}

const ALL_SECTIONS_COMPLETE: Record<string, string> = {
  portada: 'Portada texto',
  contextoCliente: 'Contexto del cliente texto',
  diagnostico: 'Diagnóstico texto',
  oportunidad: 'Oportunidad texto',
  solucion: 'Solución texto',
  alcance: 'Alcance texto',
  incluyeNoIncluye: 'Incluye texto',
  metodologia: 'Metodología texto',
  cronograma: 'Cronograma texto',
  casosExito: 'Casos texto',
  diferenciadores: 'Diferenciadores texto',
  inversion: 'Inversión texto',
  proximosPasos: 'Próximos pasos texto',
  ctaFinal: 'CTA texto',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Step3Generate', () => {
  const onNext = vi.fn()
  const onBack = vi.fn()

  beforeEach(() => {
    mockSubmit.mockReset()
    onNext.mockReset()
    onBack.mockReset()
    currentUseObjectReturn = {
      object: undefined,
      submit: mockSubmit,
      isLoading: false,
      error: undefined,
    }
  })

  it('calls submit with client and context data on mount', () => {
    render(
      <Step3Generate
        client={mockClient}
        context={mockContext}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(mockSubmit).toHaveBeenCalledOnce()
    const callArg = mockSubmit.mock.calls[0][0] as Record<string, unknown>
    expect(callArg.clientId).toBe('client-123')
    expect(callArg.clientName).toBe('María García')
    expect(callArg.company).toBe('Acme Corp')
    expect(callArg.problema).toBe('Necesitamos automatizar nuestros procesos de ventas.')
  })

  it('shows "Claude está generando..." and disables "Next" while loading', () => {
    currentUseObjectReturn = {
      object: undefined,
      submit: mockSubmit,
      isLoading: true,
      error: undefined,
    }

    render(
      <Step3Generate
        client={mockClient}
        context={mockContext}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByText(/Claude está generando/i)).toBeInTheDocument()
    // The Next button shows progress text and is disabled
    expect(screen.getByRole('button', { name: /Generando/i })).toBeDisabled()
  })

  it('renders all 14 section labels in the progress grid', () => {
    render(
      <Step3Generate
        client={mockClient}
        context={mockContext}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByText('Portada')).toBeInTheDocument()
    expect(screen.getByText('Diagnóstico')).toBeInTheDocument()
    expect(screen.getByText('Inversión')).toBeInTheDocument()
    expect(screen.getByText('CTA final')).toBeInTheDocument()
    expect(screen.getByText('Próximos pasos')).toBeInTheDocument()
    expect(screen.getByText('Metodología')).toBeInTheDocument()
  })

  it('shows completion state and enables the "Revisar" button when all sections are present', () => {
    currentUseObjectReturn = {
      object: ALL_SECTIONS_COMPLETE,
      submit: mockSubmit,
      isLoading: false,
      error: undefined,
    }

    render(
      <Step3Generate
        client={mockClient}
        context={mockContext}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByText('¡Propuesta generada!')).toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: /Revisar y exportar/i })
    expect(nextBtn).not.toBeDisabled()
  })

  it('calls onNext with sections and a proposalId when the "Revisar" button is clicked', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'proposal-abc',
        status: 'generated',
        created_at: '2026-05-07T00:00:00Z',
      }),
    } as Response)

    currentUseObjectReturn = {
      object: ALL_SECTIONS_COMPLETE,
      submit: mockSubmit,
      isLoading: false,
      error: undefined,
    }

    render(
      <Step3Generate
        client={mockClient}
        context={mockContext}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    const nextBtn = screen.getByRole('button', { name: /Revisar y exportar/i })
    await userEvent.click(nextBtn)

    expect(onNext).toHaveBeenCalledOnce()
    const [passedSections] = onNext.mock.calls[0] as [Record<string, string>, string]
    expect(passedSections.portada).toBe('Portada texto')
    expect(passedSections.inversion).toBe('Inversión texto')
  })

  it('shows an error message when the AI generation call fails', () => {
    currentUseObjectReturn = {
      object: undefined,
      submit: mockSubmit,
      isLoading: false,
      error: new Error('Network timeout'),
    }

    render(
      <Step3Generate
        client={mockClient}
        context={mockContext}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByText(/Error al generar/i)).toBeInTheDocument()
    expect(screen.getByText(/Network timeout/i)).toBeInTheDocument()
  })

  it('"Atrás" button is disabled during loading and enabled afterwards', () => {
    currentUseObjectReturn = {
      object: undefined,
      submit: mockSubmit,
      isLoading: true,
      error: undefined,
    }

    const { rerender } = render(
      <Step3Generate
        client={mockClient}
        context={mockContext}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('button', { name: 'Atrás' })).toBeDisabled()

    // Simulate generation finishing
    currentUseObjectReturn = {
      object: undefined,
      submit: mockSubmit,
      isLoading: false,
      error: undefined,
    }

    rerender(
      <Step3Generate
        client={mockClient}
        context={mockContext}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('button', { name: 'Atrás' })).not.toBeDisabled()
  })
})
