/**
 * E2E test: Full proposal wizard flow for GCPRON SAS + PDF export
 * Target: https://smart-proposal-generator-lyart.vercel.app
 *
 * Flow:
 *  1. Sign in as luchogiraldo3412@gmail.com
 *  2. Navigate to /proposals/new
 *  3. Step 1: Select GCPRON SAS client
 *  4. Step 2: Fill problem text + select a template/service
 *  5. Step 3: Wait up to 60s (no retries) for all 14 sections
 *  6. Step 4: Click "Exportar PDF" / "PDF" — report result
 */
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE = 'https://smart-proposal-generator-lyart.vercel.app'
const EMAIL = 'luchogiraldo3412@gmail.com'
const PASSWORD = 'E2ETest2026!'

const PROBLEM_TEXT =
  'Necesitamos automatizar procesos de facturación y mejorar visibilidad operativa del negocio'

const SCREENSHOTS_DIR = path.resolve('test-results/gcpron-screenshots')

const SECTION_LABELS = [
  'Portada',
  'Contexto del cliente',
  'Diagnóstico',
  'Oportunidad detectada',
  'Solución propuesta',
  'Alcance detallado',
  'Qué incluye / no incluye',
  'Metodología',
  'Cronograma',
  'Casos de éxito',
  'Diferenciadores',
  'Inversión',
  'Próximos pasos',
  'CTA final',
]

async function screenshot(page: any, name: string): Promise<string> {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  const filePath = path.join(SCREENSHOTS_DIR, `${Date.now()}-${name}.png`)
  try {
    await page.screenshot({ path: filePath, fullPage: false })
    console.log(`[screenshot] saved: ${filePath}`)
  } catch (e: any) {
    console.log(`[screenshot] FAILED (${name}): ${e.message}`)
  }
  return filePath
}

test.describe('GCPRON SAS — Full Wizard + PDF Export', () => {
  test.setTimeout(480_000) // 8 minutes total

  test('wizard: login → GCPRON → generate → PDF export', async ({ page }) => {
    const results: Record<string, any> = {
      loginSuccess: false,
      reachedWizard: false,
      step1Complete: false,
      step2Complete: false,
      step3AISuccess: false,
      sectionsVisible: 0,
      sectionNames: [] as string[],
      step4Reached: false,
      pdfButtonVisible: false,
      pdfExportResult: '',
      errors: [] as string[],
      screenshots: [] as string[],
    }

    // Collect browser errors
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        const txt = msg.text()
        if (!txt.includes('400') && !txt.includes('favicon')) {
          results.errors.push(`[console.error] ${txt}`)
        }
      }
    })
    page.on('pageerror', (err: any) => {
      results.errors.push(`[page.error] ${err.message}`)
    })

    // ── 1. SIGN IN ──────────────────────────────────────────────
    console.log('\n━━━ 1. Sign in')
    await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(1_500)

    results.screenshots.push(await screenshot(page, '01-sign-in-page'))

    const emailInput = page.locator('#email')
    await emailInput.waitFor({ state: 'visible', timeout: 15_000 })
    await emailInput.fill(EMAIL)

    const passwordInput = page.locator('#password')
    await passwordInput.fill(PASSWORD)

    results.screenshots.push(await screenshot(page, '01b-credentials-filled'))

    const submitBtn = page.getByRole('button', { name: /iniciar sesi[oó]n/i })
    await submitBtn.click()

    await page.waitForURL(/\/dashboard/, { timeout: 25_000 })
    results.loginSuccess = true
    console.log(`[login] SUCCESS — url: ${page.url()}`)
    results.screenshots.push(await screenshot(page, '01c-dashboard'))

    // ── 2. NAVIGATE TO /proposals/new ──────────────────────────
    console.log('\n━━━ 2. Navigate to /proposals/new')
    await page.goto(`${BASE}/proposals/new`, { waitUntil: 'domcontentloaded', timeout: 25_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(2_000)

    results.reachedWizard = page.url().includes('proposals/new')
    console.log(`[wizard] url: ${page.url()}, reached: ${results.reachedWizard}`)
    results.screenshots.push(await screenshot(page, '02-wizard-step1'))

    if (!results.reachedWizard) {
      results.errors.push(`Wizard not reached — redirected to ${page.url()}`)
      printSummary(results)
      return
    }

    // ── 3. STEP 1 — SELECT GCPRON SAS ──────────────────────────
    console.log('\n━━━ 3. Step 1 — Select GCPRON SAS')
    await page.waitForTimeout(2_000) // allow client list to load from API

    // Try multiple strategies to find GCPRON SAS
    let gcpronFound = false

    // Strategy A: button containing "GCPRON"
    const gcpronBtn = page.locator('button').filter({ hasText: /GCPRON/i }).first()
    gcpronFound = await gcpronBtn.isVisible({ timeout: 8_000 }).catch(() => false)

    if (gcpronFound) {
      console.log('[step1] Found GCPRON button — clicking')
      await gcpronBtn.scrollIntoViewIfNeeded()
      await gcpronBtn.click()
      await page.waitForTimeout(500)
      results.step1Complete = true
    } else {
      // Strategy B: any element with GCPRON text
      const gcpronEl = page.getByText(/GCPRON/i).first()
      gcpronFound = await gcpronEl.isVisible({ timeout: 5_000 }).catch(() => false)
      if (gcpronFound) {
        console.log('[step1] Found GCPRON element — clicking')
        await gcpronEl.click()
        await page.waitForTimeout(500)
        results.step1Complete = true
      } else {
        // Log available text for debugging
        const bodyText = await page.locator('body').textContent().catch(() => '')
        console.log(`[step1] GCPRON not found. Body preview: ${bodyText?.slice(0, 400)}`)
        results.errors.push('GCPRON SAS client not found on step 1')
      }
    }

    results.screenshots.push(await screenshot(page, '03-step1-gcpron-selected'))

    // Click "Continuar" to proceed
    const continuarBtn = page.getByRole('button', { name: /^Continuar$/i })
    const continuarEnabled = await continuarBtn.isEnabled({ timeout: 5_000 }).catch(() => false)
    console.log(`[step1] "Continuar" enabled: ${continuarEnabled}`)

    if (continuarEnabled) {
      await continuarBtn.click()
      await page.waitForTimeout(1_500)
      console.log('[step1] Clicked Continuar')
    } else {
      // Try "Continuar con análisis" variant
      const analisisBtn = page.getByRole('button', { name: /continuar con an[aá]lisis/i })
      const hasAnalisis = await analisisBtn.isEnabled({ timeout: 3_000 }).catch(() => false)
      if (hasAnalisis) {
        await analisisBtn.click()
        await page.waitForTimeout(1_500)
        console.log('[step1] Clicked "Continuar con análisis"')
      } else {
        results.errors.push('Step 1: Continuar button not enabled')
      }
    }

    results.screenshots.push(await screenshot(page, '03b-after-step1'))

    // ── 4. STEP 2 — PROBLEM + SERVICE ──────────────────────────
    console.log('\n━━━ 4. Step 2 — Fill problem + select service/template')
    await page.waitForTimeout(1_500)

    // Find problem textarea
    const problemaInput = page
      .getByPlaceholder(/desaf[ií]o de.*quieres abordar/i)
      .first()
    const hasProblema = await problemaInput.isVisible({ timeout: 8_000 }).catch(() => false)
    console.log(`[step2] Problem textarea visible: ${hasProblema}`)

    if (!hasProblema) {
      // Check if we're even on step 2
      const bodyText = await page.locator('body').textContent().catch(() => '')
      console.log(`[step2] Not on step2? Body: ${bodyText?.slice(0, 300)}`)
      results.errors.push('Step 2 textarea not found')
    } else {
      await problemaInput.fill(PROBLEM_TEXT)
      console.log(`[step2] Filled problem: "${PROBLEM_TEXT}" (${PROBLEM_TEXT.length} chars)`)
    }

    await page.waitForTimeout(500)

    // Scroll down to find services block
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(500)

    // Expand services block if collapsed
    const servicesHeader = page.getByText(/2 · Servicios a incluir/i).first()
    const hasServicesHeader = await servicesHeader.isVisible({ timeout: 5_000 }).catch(() => false)
    console.log(`[step2] Services block header visible: ${hasServicesHeader}`)

    if (hasServicesHeader) {
      // Check if content is already visible
      const firstService = page.locator('button').filter({ hasText: /USD \$/ }).first()
      const firstVisible = await firstService.isVisible({ timeout: 2_000 }).catch(() => false)
      if (!firstVisible) {
        // Block is collapsed — expand it
        await servicesHeader.click()
        await page.waitForTimeout(800)
        console.log('[step2] Expanded services block')
      }
    }

    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(500)

    // Try to select first available service
    const serviceButtons = page.locator('button').filter({ hasText: /USD \$/ })
    const serviceCount = await serviceButtons.count().catch(() => 0)
    console.log(`[step2] Service buttons found: ${serviceCount}`)

    if (serviceCount > 0) {
      const firstSvc = serviceButtons.first()
      await firstSvc.scrollIntoViewIfNeeded()
      await firstSvc.click()
      await page.waitForTimeout(800)
      const svcText = await firstSvc.textContent().catch(() => '')
      console.log(`[step2] Clicked service: "${svcText?.slice(0, 60)}"`)
    } else {
      // Fallback: try named service buttons
      const paidMedia = page.locator('button').filter({ hasText: 'Paid Media' }).first()
      const hasPaidMedia = await paidMedia.isVisible({ timeout: 3_000 }).catch(() => false)
      if (hasPaidMedia) {
        await paidMedia.click()
        await page.waitForTimeout(500)
        console.log('[step2] Clicked Paid Media service')
      } else {
        results.errors.push('Step 2: No service buttons found to select')
      }
    }

    results.screenshots.push(await screenshot(page, '04-step2-filled'))

    // Scroll to bottom for the sticky footer button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Click generate button
    const generateBtn = page.getByRole('button', { name: /Generar propuesta con IA/i })
    const generateEnabled = await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    console.log(`[step2] "Generar propuesta con IA" visible: ${generateEnabled}`)

    if (generateEnabled) {
      await generateBtn.click()
      results.step2Complete = true
      console.log('[step2] Clicked "Generar propuesta con IA"')
    } else {
      const disabledBtn = page.getByRole('button', { name: /Completa los campos requeridos/i })
      const isDisabled = await disabledBtn.isVisible({ timeout: 3_000 }).catch(() => false)
      if (isDisabled) {
        // Check what is missing
        const problemaVal = await page
          .getByPlaceholder(/desaf[ií]o/i)
          .first()
          .inputValue()
          .catch(() => '')
        console.log(
          `[step2] Button still disabled. problema="${problemaVal.slice(0, 50)}" (${problemaVal.length} chars)`
        )
        results.errors.push(`Step 2: Generate button disabled (problema: ${problemaVal.length} chars)`)
      } else {
        results.errors.push('Step 2: Generate button not found')
      }
    }

    results.screenshots.push(await screenshot(page, '04b-after-generate-click'))

    // ── 5. STEP 3 — AI GENERATION (wait up to 60s, no retries) ─
    console.log('\n━━━ 5. Step 3 — AI generation (max 60s)')
    await page.waitForTimeout(2_000)
    results.screenshots.push(await screenshot(page, '05-step3-start'))

    const reviewBtn = page.getByRole('button', { name: /Revisar y exportar/i })

    try {
      await expect(reviewBtn).toBeEnabled({ timeout: 60_000 })
      results.step3AISuccess = true
      const elapsed = 'within 60s'
      console.log(`[step3] Generation completed ${elapsed}`)
    } catch {
      console.log('[step3] Generation did NOT complete within 60s')
      const errorEl = page.getByText(/error al generar|sin respuesta/i).first()
      const hasError = await errorEl.isVisible({ timeout: 2_000 }).catch(() => false)
      if (hasError) {
        const errText = await errorEl.textContent().catch(() => '')
        results.errors.push(`Step 3 error: ${errText?.slice(0, 150)}`)
        console.log(`[step3] Error shown: ${errText?.slice(0, 150)}`)
      } else {
        results.errors.push('Step 3: Generation timed out after 60s (no error message shown)')
      }
    }

    // Count section checkmarks regardless of completion
    for (const label of SECTION_LABELS) {
      const el = page.getByText(label, { exact: true }).first()
      const isVisible = await el.isVisible({ timeout: 500 }).catch(() => false)
      if (isVisible) {
        results.sectionsVisible++
        results.sectionNames.push(label)
      }
    }
    console.log(`[step3] Sections visible: ${results.sectionsVisible}/14`)
    console.log(`[step3] Section names: ${results.sectionNames.join(', ')}`)

    // Screenshot after generation
    results.screenshots.push(await screenshot(page, '05b-step3-generation-complete'))

    // Also take a full scrolled view to capture all section checkmarks
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    results.screenshots.push(await screenshot(page, '05c-step3-top'))
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(300)
    results.screenshots.push(await screenshot(page, '05d-step3-middle'))
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(300)
    results.screenshots.push(await screenshot(page, '05e-step3-bottom'))

    // ── 6. STEP 4 — REVIEW & PDF EXPORT ────────────────────────
    console.log('\n━━━ 6. Step 4 — Review page + PDF export')

    // Navigate to step 4
    const canClick = await reviewBtn.isEnabled({ timeout: 3_000 }).catch(() => false)
    if (canClick) {
      await reviewBtn.click()
    } else {
      // Force click even if disabled — might still navigate
      await reviewBtn.click({ force: true }).catch(() => {})
    }
    await page.waitForTimeout(3_000)

    results.screenshots.push(await screenshot(page, '06-step4-review'))

    // Detect step 4 markers
    const exportarHeading = page.getByText(/^Exportar$/).first()
    const hasExportar = await exportarHeading.isVisible({ timeout: 10_000 }).catch(() => false)
    const propComercial = page.getByText(/Propuesta Comercial/i).first()
    const hasProposal = await propComercial.isVisible({ timeout: 5_000 }).catch(() => false)
    results.step4Reached = hasExportar || hasProposal
    console.log(
      `[step4] "Exportar" sidebar: ${hasExportar}, "Propuesta Comercial": ${hasProposal}`
    )

    // Check for TipTap editor
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first()
    const editorVisible = await editor.isVisible({ timeout: 5_000 }).catch(() => false)
    if (editorVisible) {
      const content = await editor.textContent().catch(() => '')
      console.log(`[step4] TipTap editor visible, content length: ${content?.length} chars`)
    }

    results.screenshots.push(await screenshot(page, '06b-step4-full-view'))

    // ── PDF EXPORT ───────────────────────────────────────────────
    console.log('\n━━━ 7. PDF Export')

    // Look for PDF button — could be "PDF", "Exportar PDF", etc.
    let pdfBtn = page.getByRole('button', { name: /^PDF$/i })
    results.pdfButtonVisible = await pdfBtn.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!results.pdfButtonVisible) {
      pdfBtn = page.locator('button').filter({ hasText: /pdf/i }).first()
      results.pdfButtonVisible = await pdfBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    }

    if (!results.pdfButtonVisible) {
      // Try "Exportar PDF" explicit text
      pdfBtn = page.getByRole('button', { name: /exportar pdf/i })
      results.pdfButtonVisible = await pdfBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    }

    console.log(`[step4] PDF button visible: ${results.pdfButtonVisible}`)

    if (results.pdfButtonVisible) {
      const btnText = await pdfBtn.textContent().catch(() => '')
      console.log(`[step4] PDF button text: "${btnText?.trim()}"`)

      // Set up download listener before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 45_000 }).catch(() => null)

      await pdfBtn.click()
      console.log('[step4] Clicked PDF button')

      // Wait a moment then screenshot
      await page.waitForTimeout(2_000)
      results.screenshots.push(await screenshot(page, '07-after-pdf-click'))

      // Check for loading state
      const loadingText = page.getByText(/generando\.\.\.|preparando|cargando/i).first()
      const isLoading = await loadingText.isVisible({ timeout: 3_000 }).catch(() => false)
      if (isLoading) {
        console.log('[step4] PDF is being generated — waiting...')
        await page.waitForFunction(
          () =>
            !document.body.innerText.match(/generando\.\.\.|preparando pdf/i),
          { timeout: 45_000 }
        ).catch(() => {})
        await page.waitForTimeout(1_000)
      }

      results.screenshots.push(await screenshot(page, '07b-pdf-generation-result'))

      // Await the download
      const download = await downloadPromise
      if (download) {
        const filename = download.suggestedFilename()
        results.pdfExportResult = `DOWNLOADED: ${filename}`
        console.log(`[step4] PDF downloaded successfully: "${filename}"`)

        // Save the file
        const savePath = path.join(SCREENSHOTS_DIR, filename || 'proposal.pdf')
        await download.saveAs(savePath).catch(() => {})
        console.log(`[step4] Saved to: ${savePath}`)
      } else {
        // Check for success/error messages
        const pageText = await page.locator('body').textContent().catch(() => '')

        // Success indicators
        if (
          pageText?.match(/descargado|listo|generado correctamente|pdf.*enviado/i)
        ) {
          results.pdfExportResult = 'SUCCESS: success message found on page'
          console.log('[step4] Success message detected')
        }
        // Check new tab
        else if (page.context().pages().length > 1) {
          results.pdfExportResult = 'OPENED_NEW_TAB: PDF may be in new tab'
          console.log('[step4] A new tab was opened (PDF in new tab?)')
        }
        // Error indicators
        else if (pageText?.match(/error.*pdf|no se pudo.*pdf|503|no disponible/i)) {
          // Find the specific error
          const errorEl = page
            .locator('.text-red-600, .text-red-700, [class*="error"], [class*="toast"]')
            .first()
          const errText = await errorEl.textContent().catch(() => pageText?.slice(0, 200) ?? '')
          results.pdfExportResult = `ERROR: ${errText?.slice(0, 200)}`
          results.errors.push(`PDF export error: ${errText?.slice(0, 200)}`)
          console.log(`[step4] PDF error: ${errText?.slice(0, 200)}`)
        } else {
          results.pdfExportResult =
            'UNKNOWN: no download event, no clear success/error message'
          console.log('[step4] PDF export result unclear — checking UI state')

          // Capture more details
          const toasts = await page.locator('[class*="toast"], [role="alert"]').allTextContents()
          if (toasts.length > 0) {
            console.log(`[step4] Toasts visible: ${toasts.join(' | ')}`)
            results.pdfExportResult = `TOAST: ${toasts.join(' | ')}`
          }
        }
      }
    } else {
      results.errors.push('Step 4: PDF button not found — listing all buttons on page')
      const allBtns = await page.locator('button').allTextContents()
      console.log(`[step4] All buttons: ${allBtns.join(' | ')}`)
    }

    // Final screenshot
    results.screenshots.push(await screenshot(page, '08-final-state'))

    printSummary(results)
  })
})

function printSummary(results: Record<string, any>) {
  console.log('\n' + '═'.repeat(65))
  console.log('TEST RESULTS — GCPRON SAS WIZARD + PDF EXPORT')
  console.log('═'.repeat(65))
  console.log(`Login:                      ${results.loginSuccess ? 'SUCCESS' : 'FAILED'}`)
  console.log(`Reached /proposals/new:     ${results.reachedWizard ? 'YES' : 'NO'}`)
  console.log(`Step 1 — GCPRON selected:   ${results.step1Complete ? 'PASS' : 'FAIL'}`)
  console.log(`Step 2 — Problem + service: ${results.step2Complete ? 'PASS' : 'FAIL'}`)
  console.log(`Step 3 — AI generation:     ${results.step3AISuccess ? 'SUCCESS' : 'TIMED OUT / FAILED'}`)
  console.log(`  Sections visible:         ${results.sectionsVisible}/14`)
  if (results.sectionNames.length > 0) {
    results.sectionNames.forEach((n: string) => console.log(`    - ${n}`))
  }
  console.log(`Step 4 — Review reached:    ${results.step4Reached ? 'YES' : 'NO'}`)
  console.log(`  PDF button found:         ${results.pdfButtonVisible ? 'YES' : 'NO'}`)
  console.log(`  PDF export result:        ${results.pdfExportResult || 'N/A'}`)
  if (results.errors.length > 0) {
    console.log('\nErrors encountered:')
    results.errors.forEach((e: string) => console.log(`  - ${e}`))
  }
  console.log('\nScreenshots:')
  results.screenshots.forEach((s: string) => console.log(`  ${s}`))
  console.log('═'.repeat(65))
}
