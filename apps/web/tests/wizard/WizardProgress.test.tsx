import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WizardProgress } from '@/components/wizard/WizardProgress'

// The four steps defined in WizardProgress
const STEP_LABELS = ['Cliente', 'Contexto', 'Generación', 'Revisión']
const STEP_DESCRIPTIONS = [
  'Selecciona o crea un cliente',
  'Describe el problema y configuración',
  'Claude redacta tu propuesta',
  'Revisa y exporta',
]

describe('WizardProgress', () => {
  it('renders all four step labels and their descriptions', () => {
    render(<WizardProgress currentStep={1} />)

    STEP_LABELS.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
    STEP_DESCRIPTIONS.forEach((desc) => {
      expect(screen.getByText(desc)).toBeInTheDocument()
    })
  })

  it('displays the step number for pending (future) steps instead of a check icon', () => {
    // On step 1, steps 2–4 are pending and must show their numeric label
    render(<WizardProgress currentStep={1} />)

    // Pending steps show their number as text
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows check icons for all completed steps (steps before currentStep)', () => {
    // currentStep=3 → steps 1 and 2 are done
    render(<WizardProgress currentStep={3} />)

    // lucide Check renders an SVG; the numeric labels 1 and 2 should NOT appear
    // because completed steps replace the number with a Check icon
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.queryByText('2')).not.toBeInTheDocument()

    // Step 4 is still pending and keeps its number
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('marks only the current step as active (ring styling via aria / class)', () => {
    const { container } = render(<WizardProgress currentStep={2} />)

    // The active step circle carries the ring class; check it appears exactly once
    const ringElements = container.querySelectorAll('[class*="ring-4"]')
    expect(ringElements).toHaveLength(1)
  })

  it('renders the "Progreso" section heading', () => {
    render(<WizardProgress currentStep={1} />)
    expect(screen.getByText('Progreso')).toBeInTheDocument()
  })

  it('renders connector lines between steps but not after the last step', () => {
    // There are 4 steps → 3 connectors (the w-0.5 dividers)
    const { container } = render(<WizardProgress currentStep={1} />)
    // Connectors carry min-h-[28px] which is unique to them
    const connectors = container.querySelectorAll('[class*="min-h-\\[28px\\]"]')
    expect(connectors).toHaveLength(3)
  })
})
