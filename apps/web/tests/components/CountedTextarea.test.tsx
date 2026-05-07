import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CountedTextarea } from '@/components/ui/counted-textarea'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Controlled wrapper so we can drive `value` from tests. */
import { useState } from 'react'

function ControlledCountedTextarea({
  maxLength,
  minLength,
  initialValue = '',
  smart,
}: {
  maxLength: number
  minLength?: number
  initialValue?: string
  smart?: boolean
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <CountedTextarea
      maxLength={maxLength}
      minLength={minLength}
      smart={smart}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CountedTextarea', () => {
  it('renders a textarea element', () => {
    render(<CountedTextarea maxLength={200} value="" onChange={() => {}} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows the character counter (len / max) when smart is false (default)', () => {
    render(<CountedTextarea maxLength={100} value="Hola" onChange={() => {}} />)
    // Counter format: "{len} / {max}" using es-CL locale (no thousands separator for small numbers)
    expect(screen.getByText(/4\s*\/\s*100/)).toBeInTheDocument()
  })

  it('hides the counter when smart=true and usage is ≤50%', () => {
    // 30 / 100 = 30% — below the 50% threshold
    const value = 'a'.repeat(30)
    render(
      <CountedTextarea maxLength={100} value={value} smart onChange={() => {}} />,
    )
    expect(screen.queryByText(/30\s*\/\s*100/)).not.toBeInTheDocument()
  })

  it('shows the counter when smart=true and usage exceeds 50%', () => {
    // 60 / 100 = 60% — above the 50% threshold
    const value = 'a'.repeat(60)
    render(
      <CountedTextarea maxLength={100} value={value} smart onChange={() => {}} />,
    )
    expect(screen.getByText(/60\s*\/\s*100/)).toBeInTheDocument()
  })

  it('applies amber styling when usage is between 80% and 95%', () => {
    // 85 / 100 = 85%
    const value = 'a'.repeat(85)
    render(<CountedTextarea maxLength={100} value={value} onChange={() => {}} />)
    const counter = screen.getByText(/85\s*\/\s*100/)
    expect(counter.className).toContain('text-amber-600')
  })

  it('applies red/danger styling when usage is ≥95%', () => {
    // 98 / 100 = 98%
    const value = 'a'.repeat(98)
    render(<CountedTextarea maxLength={100} value={value} onChange={() => {}} />)
    const counter = screen.getByText(/98\s*\/\s*100/)
    expect(counter.className).toContain('text-red-600')
  })

  it('shows the minimum-length hint when current length is below minLength', () => {
    render(
      <CountedTextarea
        maxLength={500}
        minLength={50}
        value="corto"
        onChange={() => {}}
      />,
    )
    expect(screen.getByText(/Mínimo 50 caracteres/i)).toBeInTheDocument()
  })

  it('hides the minimum-length hint once the required length is met', () => {
    const value = 'a'.repeat(50)
    render(
      <CountedTextarea
        maxLength={500}
        minLength={50}
        value={value}
        onChange={() => {}}
      />,
    )
    expect(screen.queryByText(/Mínimo 50 caracteres/i)).not.toBeInTheDocument()
  })

  it('enforces maxLength — HTML attribute prevents typing beyond limit', async () => {
    render(<ControlledCountedTextarea maxLength={5} />)
    const textarea = screen.getByRole('textbox')

    await userEvent.type(textarea, '123456789')

    // The textarea's maxLength HTML attribute caps input at 5 characters
    expect((textarea as HTMLTextAreaElement).maxLength).toBe(5)
    expect((textarea as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(5)
  })

  it('renders nothing in the min-hint slot when minLength is not provided', () => {
    render(<CountedTextarea maxLength={200} value="" onChange={() => {}} />)
    // No "Mínimo" text should appear
    expect(screen.queryByText(/Mínimo/i)).not.toBeInTheDocument()
  })
})
