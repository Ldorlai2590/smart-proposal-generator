/**
 * Unit tests for Step1Client — website URL analysis UI
 *
 * We test the "create new client" panel because that is where the full
 * "Analizar con IA" button label is rendered.  Tests for the selected-client
 * inline panel use the shorter "Analizar" label variant.
 *
 * Mocks:
 *  - global fetch → /api/clients list + /api/analyze-url
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Step1Client, type ClientData } from './Step1Client'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Silence logger-related console noise coming from child components
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
    withRequestId: vi.fn().mockReturnThis(),
  },
}))

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const FAKE_CLIENTS_RESPONSE = {
  items: [
    {
      id: 'client-1',
      tenant_id: 'tenant-1',
      name: 'Juan Pérez',
      company: 'Acme Corp',
      email: 'juan@acme.com',
      industry: 'Tecnología',
      company_size: '11-50',
      score: 85,
    },
  ],
  total: 1,
  page: 1,
  per_page: 20,
  pages: 1,
}

const FAKE_ANALYSIS = {
  business_model: 'SaaS B2B',
  value_proposition: 'Automatiza propuestas comerciales',
  target_audience: 'PYMEs LATAM',
  key_differentiators: ['Velocidad', 'IA'],
  pain_points: ['Ventas lentas'],
  opportunities: ['Escalar inbound'],
  communication_tone: 'formal',
  executive_summary: 'Empresa de software para ventas B2B.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders Step1Client and navigates to the "create new client" sub-view
 * (the panel that has the full "Analizar con IA" button).
 */
async function renderCreateFlow(onNext = vi.fn()) {
  // First call: initial clients fetch; second call returns empty so "create"
  // button appears without a long list.
  const clientsFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ items: [], total: 0, page: 1, per_page: 20, pages: 0 }),
  })
  vi.stubGlobal('fetch', clientsFetch)

  const utils = render(<Step1Client onNext={onNext} />)

  // Wait for initial clients load to finish
  await waitFor(() => expect(clientsFetch).toHaveBeenCalled())

  // Click "Crear nuevo cliente" link
  const createLink = await screen.findByText(/Crear nuevo cliente/i)
  fireEvent.click(createLink)

  return { ...utils, clientsFetch, onNext }
}

/**
 * Renders Step1Client with one existing client already listed.
 */
async function renderWithExistingClient(onNext = vi.fn()) {
  const clientsFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => FAKE_CLIENTS_RESPONSE,
  })
  vi.stubGlobal('fetch', clientsFetch)

  const utils = render(<Step1Client onNext={onNext} />)

  // Wait for the client to appear
  await screen.findByText('Juan Pérez')

  return { ...utils, clientsFetch, onNext }
}

// ---------------------------------------------------------------------------
// Tests — create-client flow (full "Analizar con IA" button)
// ---------------------------------------------------------------------------

describe('Step1Client — "Analizar con IA" button (create-client flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('button is disabled when URL field is empty', async () => {
    await renderCreateFlow()

    const btn = screen.getByRole('button', { name: /Analizar con IA/i })
    expect(btn).toBeDisabled()
  })

  it('button is enabled when URL field has a value', async () => {
    await renderCreateFlow()

    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://acme.com')

    const btn = screen.getByRole('button', { name: /Analizar con IA/i })
    expect(btn).not.toBeDisabled()
  })

  it('shows loading state while analyzing', async () => {
    // Fetch for /api/analyze-url hangs until we resolve it
    let resolveAnalysis!: (v: unknown) => void
    const analysisFetch = vi.fn()

    analysisFetch
      // First call is the initial /api/clients GET (already resolved above —
      // but in this helper we need to intercept the second call too)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0, page: 1, per_page: 20, pages: 0 }),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAnalysis = resolve
          }),
      )

    vi.stubGlobal('fetch', analysisFetch)

    const onNext = vi.fn()
    render(<Step1Client onNext={onNext} />)
    await waitFor(() => expect(analysisFetch).toHaveBeenCalledTimes(1))

    const createLink = await screen.findByText(/Crear nuevo cliente/i)
    fireEvent.click(createLink)

    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://acme.com')

    const btn = screen.getByRole('button', { name: /Analizar con IA/i })
    fireEvent.click(btn)

    // Loading text should appear immediately
    await screen.findByText(/Analizando\.\.\./i)
    expect(btn).toBeDisabled()

    // Resolve the pending request to clean up
    resolveAnalysis({
      ok: true,
      status: 200,
      json: async () => FAKE_ANALYSIS,
    })
  })

  it('shows AnalysisCard ("Sitio analizado con IA ✓") after successful analysis', async () => {
    const { clientsFetch } = await renderCreateFlow()

    // Override fetch so the analysis call returns the fake data
    clientsFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => FAKE_ANALYSIS,
      })
    vi.stubGlobal('fetch', clientsFetch)

    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://acme.com')

    const btn = screen.getByRole('button', { name: /Analizar con IA/i })
    fireEvent.click(btn)

    await screen.findByText(/Sitio analizado con IA ✓/i)
  })

  it('shows error message when analysis API returns an error', async () => {
    const { clientsFetch } = await renderCreateFlow()

    clientsFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'fetch_failed', message: 'No se pudo acceder al sitio web.' }),
    })
    vi.stubGlobal('fetch', clientsFetch)

    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://down.example.com')

    const btn = screen.getByRole('button', { name: /Analizar con IA/i })
    fireEvent.click(btn)

    await screen.findByText(/No se pudo acceder al sitio web\./i)
  })

  it('shows generic error message when fetch rejects (network failure)', async () => {
    const { clientsFetch } = await renderCreateFlow()

    clientsFetch.mockRejectedValueOnce(new Error('Failed to fetch'))
    vi.stubGlobal('fetch', clientsFetch)

    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://unreachable.example.com')

    fireEvent.click(screen.getByRole('button', { name: /Analizar con IA/i }))

    await screen.findByText(/Failed to fetch/i)
  })

  it('calls onNext with ai_business_model and ai_executive_summary when analysis succeeds and form is submitted', async () => {
    const onNext = vi.fn()

    // clients fetch (initial empty list)
    const clientsFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0, page: 1, per_page: 20, pages: 0 }),
      })
    vi.stubGlobal('fetch', clientsFetch)

    render(<Step1Client onNext={onNext} />)
    await waitFor(() => expect(clientsFetch).toHaveBeenCalledTimes(1))

    // Navigate to create form
    const createLink = await screen.findByText(/Crear nuevo cliente/i)
    fireEvent.click(createLink)

    // Fill required fields
    const nameInput = screen.getByPlaceholderText('Nombre completo')
    const companyInput = screen.getByPlaceholderText('Nombre de la empresa')
    await userEvent.type(nameInput, 'Ana Gómez')
    await userEvent.type(companyInput, 'TechStart')

    // Fill URL and run analysis
    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://techstart.io')

    // Mock: analyze-url call + POST /api/clients
    clientsFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => FAKE_ANALYSIS,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'new-client-id',
          tenant_id: 'tenant-1',
          name: 'Ana Gómez',
          company: 'TechStart',
          email: null,
          industry: null,
          company_size: null,
          score: 0,
        }),
      })
    vi.stubGlobal('fetch', clientsFetch)

    fireEvent.click(screen.getByRole('button', { name: /Analizar con IA/i }))
    await screen.findByText(/Sitio analizado con IA ✓/i)

    // Submit the create form
    fireEvent.click(screen.getByRole('button', { name: /Crear cliente y continuar/i }))

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1))

    const calledWith: ClientData = onNext.mock.calls[0][0]
    expect(calledWith.ai_business_model).toBe(FAKE_ANALYSIS.business_model)
    expect(calledWith.ai_executive_summary).toBe(FAKE_ANALYSIS.executive_summary)
  })
})

// ---------------------------------------------------------------------------
// Tests — selected existing client flow (shorter "Analizar" button)
// ---------------------------------------------------------------------------

describe('Step1Client — "Analizar" button (selected-client flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inline URL panel is hidden until a client is selected', async () => {
    await renderWithExistingClient()

    // The URL panel ("https://empresa.com" placeholder) should not be visible yet
    expect(screen.queryByPlaceholderText('https://empresa.com')).not.toBeInTheDocument()
  })

  it('inline URL panel appears after selecting an existing client', async () => {
    await renderWithExistingClient()

    fireEvent.click(screen.getByText('Juan Pérez'))

    expect(screen.getByPlaceholderText('https://empresa.com')).toBeInTheDocument()
  })

  it('"Analizar" button is disabled when URL field is empty', async () => {
    await renderWithExistingClient()
    fireEvent.click(screen.getByText('Juan Pérez'))

    // "Analizar" is the button label in the selected-client panel
    const btn = screen.getByRole('button', { name: /^Analizar$/i })
    expect(btn).toBeDisabled()
  })

  it('"Analizar" button is enabled when URL field is filled', async () => {
    await renderWithExistingClient()
    fireEvent.click(screen.getByText('Juan Pérez'))

    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://acme.com')

    const btn = screen.getByRole('button', { name: /^Analizar$/i })
    expect(btn).not.toBeDisabled()
  })

  it('shows AnalysisCard after successful analysis on selected client', async () => {
    const { clientsFetch } = await renderWithExistingClient()
    fireEvent.click(screen.getByText('Juan Pérez'))

    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://acme.com')

    clientsFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => FAKE_ANALYSIS,
    })
    vi.stubGlobal('fetch', clientsFetch)

    fireEvent.click(screen.getByRole('button', { name: /^Analizar$/i }))

    await screen.findByText(/Sitio analizado con IA ✓/i)
  })

  it('passes ai_business_model and ai_executive_summary to onNext when continuing', async () => {
    const onNext = vi.fn()
    const { clientsFetch } = await renderWithExistingClient(onNext)

    // Select client
    fireEvent.click(screen.getByText('Juan Pérez'))

    const urlInput = screen.getByPlaceholderText('https://empresa.com')
    await userEvent.type(urlInput, 'https://acme.com')

    clientsFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => FAKE_ANALYSIS,
    })
    vi.stubGlobal('fetch', clientsFetch)

    fireEvent.click(screen.getByRole('button', { name: /^Analizar$/i }))
    await screen.findByText(/Sitio analizado con IA ✓/i)

    // Click "Continuar con análisis →"
    fireEvent.click(screen.getByRole('button', { name: /Continuar con análisis/i }))

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1))

    const calledWith: ClientData = onNext.mock.calls[0][0]
    expect(calledWith.ai_business_model).toBe(FAKE_ANALYSIS.business_model)
    expect(calledWith.ai_executive_summary).toBe(FAKE_ANALYSIS.executive_summary)
  })
})
