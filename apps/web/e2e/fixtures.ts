import { test as base, expect, Page } from '@playwright/test'

/**
 * User profile — cada spec inyecta el suyo.
 */
export interface UserProfile {
  label: string
  email: string // usa +clerk_test@ para bypass de email verification en test mode
  password: string
  orgName: string
  clientName: string
  clientCompany: string
  clientEmail: string
  clientIndustry: string
  companySize: string
  problema: string
  budget: number
  timelineWeeks: number
  templateIndustry: string
}

export const test = base.extend<{ profile: UserProfile }>({
  profile: [
    {
      label: 'default',
      email: 'test+clerk_test@smartspg.dev',
      password: 'TestPass123!Test',
      orgName: 'Default Org',
      clientName: 'Default Client',
      clientCompany: 'Default Co',
      clientEmail: 'cliente@default.com',
      clientIndustry: 'Tecnología',
      companySize: '11-50',
      problema: 'Problema por defecto',
      budget: 10000,
      timelineWeeks: 8,
      templateIndustry: 'Tecnología',
    },
    { option: true },
  ],
})

export { expect }

/**
 * Helper: loguea cada paso con un header visible en la consola Playwright.
 */
export async function step(page: Page, label: string, fn: () => Promise<void>) {
  console.log(`\n━━━ [${page.context().browser()?.version().slice(0, 4)}] ${label}`)
  await fn()
  await page.screenshot({
    path: `test-results/screenshots/${Date.now()}-${label.replace(/\W+/g, '_')}.png`,
    fullPage: true,
  })
}

/**
 * Clerk test-mode signup.
 * Requiere que la Space/localhost use una publishable key de tipo pk_test_*.
 * El email debe contener el tag `+clerk_test` y el código de verificación es 424242.
 */
export async function signUp(page: Page, user: UserProfile) {
  await page.goto('/sign-up')
  await page.waitForLoadState('networkidle')

  // Clerk <SignUp/> renderiza un iframe o un form inline — soportamos ambos
  const emailInput = page.getByLabel(/email/i).first()
  await emailInput.waitFor({ state: 'visible', timeout: 20_000 })
  await emailInput.fill(user.email)

  const passwordInput = page.getByLabel(/password/i).first()
  if (await passwordInput.isVisible().catch(() => false)) {
    await passwordInput.fill(user.password)
  }

  await page.getByRole('button', { name: /continue|sign up|registrarme/i }).click()

  // Verification code — en test mode siempre 424242
  const codeInput = page.locator('input[name*="code"], input[inputmode="numeric"]').first()
  if (await codeInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await codeInput.fill('424242')
    await page.waitForTimeout(500)
  }

  // Esperar redirect a /onboarding o /dashboard
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30_000 })
}

/**
 * Completa el onboarding o lo salta.
 */
export async function doOnboarding(page: Page, user: UserProfile, skip = false) {
  if (!page.url().includes('/onboarding')) return

  if (skip) {
    const skipBtn = page.getByRole('button', { name: /saltar por ahora/i })
    if (await skipBtn.isVisible().catch(() => false)) {
      await skipBtn.click()
      await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
      return
    }
  }

  // Paso 1: info de la empresa
  await page.getByLabel(/nombre.*empresa|company/i).first().fill(user.orgName)
  await page.getByRole('button', { name: /siguiente|next|continuar/i }).click()

  // Paso 2: industria / target (campos opcionales — saltamos si no aparecen)
  const nextBtn = page.getByRole('button', { name: /siguiente|next|continuar|finalizar/i })
  while (!page.url().includes('/dashboard')) {
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.first().click()
      await page.waitForTimeout(800)
    } else {
      break
    }
  }

  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

/**
 * Crea un cliente desde la página /clients via el dialog.
 */
export async function createClient(page: Page, user: UserProfile) {
  await page.goto('/clients')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /nuevo cliente|agregar cliente|\+/i }).first().click()

  await page.getByLabel(/nombre/i).first().fill(user.clientName)
  await page.getByLabel(/empresa|company/i).first().fill(user.clientCompany)
  await page.getByLabel(/email/i).first().fill(user.clientEmail)

  const industrySelect = page.getByLabel(/industria/i).first()
  if (await industrySelect.isVisible().catch(() => false)) {
    await industrySelect.click()
    await page.getByRole('option', { name: new RegExp(user.clientIndustry, 'i') }).click()
  }

  const sizeSelect = page.getByLabel(/tama\u00f1o|size/i).first()
  if (await sizeSelect.isVisible().catch(() => false)) {
    await sizeSelect.click()
    await page.getByRole('option', { name: new RegExp(user.companySize, 'i') }).click()
  }

  await page.getByRole('button', { name: /crear|guardar|save/i }).first().click()

  // Esperar que aparezca la tarjeta del cliente en el listado
  await expect(page.getByText(user.clientCompany)).toBeVisible({ timeout: 10_000 })
}

/**
 * Corre el wizard de propuesta completo (4 pasos).
 */
export async function runProposalWizard(page: Page, user: UserProfile) {
  await page.goto('/proposals/new')
  await page.waitForLoadState('networkidle')

  // ── Paso 1: Cliente ────────────────────────────────────
  await step(page, '01-select-client', async () => {
    await page.getByText(user.clientCompany).first().click()
    await page.getByRole('button', { name: /siguiente/i }).click()
  })

  // ── Paso 2: Contexto ───────────────────────────────────
  await step(page, '02-context', async () => {
    await page.getByLabel(/problema|problem/i).first().fill(user.problema)

    // Budget slider — Playwright maneja input type=range via fill
    const budgetInput = page.locator('input[type="range"], input[name*="budget"]').first()
    if (await budgetInput.isVisible().catch(() => false)) {
      await budgetInput.fill(String(user.budget))
    }

    // Template industria — click en la card
    const tmplCard = page.getByText(new RegExp(user.templateIndustry, 'i')).first()
    if (await tmplCard.isVisible().catch(() => false)) {
      await tmplCard.click()
    }

    await page.getByRole('button', { name: /siguiente/i }).click()
  })

  // ── Paso 3: Generación IA (streaming) ──────────────────
  await step(page, '03-ai-generation', async () => {
    // Esperar que termine el streaming — botón "Siguiente" se habilita
    const nextBtn = page.getByRole('button', { name: /siguiente/i })
    await expect(nextBtn).toBeEnabled({ timeout: 90_000 })

    // Verificar que todas las secciones aparecieron
    const sections = [
      /resumen ejecutivo/i,
      /problema/i,
      /servicios propuestos|soluci\u00f3n/i,
      /alcance/i,
      /timeline/i,
      /inversi\u00f3n/i,
      /pr\u00f3ximos pasos/i,
    ]
    for (const s of sections) {
      await expect(page.getByText(s).first()).toBeVisible({ timeout: 10_000 })
    }

    await nextBtn.click()
  })

  // ── Paso 4: Revisión + export ──────────────────────────
  await step(page, '04-review-export', async () => {
    // Verificar que el editor TipTap cargó con contenido
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first()
    await expect(editor).toBeVisible({ timeout: 10_000 })

    // Click en export PDF (sin descargar realmente — solo verificar que el botón existe)
    const pdfBtn = page.getByRole('button', { name: /pdf/i }).first()
    await expect(pdfBtn).toBeVisible()
  })
}
