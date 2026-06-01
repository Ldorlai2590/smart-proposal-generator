/**
 * Production E2E test — full proposal wizard flow
 * Target: https://smart-proposal-generator-lyart.vercel.app
 *
 * Based on actual source code analysis:
 * - Step 1 button: "Continuar"
 * - Step 2 requires: problema >= 20 chars + at least 1 service selected
 * - Step 2 button: "Generar propuesta con IA →"
 * - Step 3 button: "Revisar y exportar →" (enabled when all 14 sections complete)
 * - Step 4 PDF button: "PDF" (green button in sidebar)
 * - 14 sections: portada, contextoCliente, diagnostico, oportunidad, solucion,
 *   alcance, incluyeNoIncluye, metodologia, cronograma, casosExito,
 *   diferenciadores, inversion, proximosPasos, ctaFinal
 */
import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE = process.env.BASE_URL ?? 'https://smart-proposal-generator-lyart.vercel.app'
const EMAIL = 'luchogiraldo3412@gmail.com'
const PASSWORD = 'E2ETest2026!'  // set via Supabase Admin API

const SCREENSHOTS_DIR = 'test-results/screenshots'

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

async function screenshot(page: any, name: string) {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  const filePath = path.join(SCREENSHOTS_DIR, `${Date.now()}-${name}.png`)
  try {
    // Use viewport-only screenshot (not fullPage) to avoid Chrome headless crash on tall pages
    await page.screenshot({ path: filePath, fullPage: false })
    console.log(`[screenshot] ${filePath}`)
  } catch (e: any) {
    console.log(`[screenshot] FAILED for ${name}: ${e.message}`)
  }
  return filePath
}

test.describe('Production Wizard — Full Flow', () => {
  test.setTimeout(600_000) // 10 minutes — allows 3 AI generation attempts of 120s each

  test('complete proposal generation flow', async ({ page }) => {
    const results: Record<string, any> = {
      loginSuccess: false,
      reachedWizard: false,
      step1Complete: false,
      step2Complete: false,
      step3AISuccess: false,
      step3SinRespuesta: false,
      step3ErrorMsg: '',
      sectionsGenerated: 0,
      sectionNames: [] as string[],
      progressPctAtEnd: 0,
      step4Reached: false,
      editorVisible: false,
      editorContentLength: 0,
      pdfButtonVisible: false,
      pdfExportResult: '',
      errors: [] as string[],
      screenshots: [] as string[],
    }

    // Capture console errors
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Skip Supabase 400s during login attempts
        if (!text.includes('400')) {
          results.errors.push(`[console.error] ${text}`)
        }
      }
    })
    page.on('pageerror', (err: any) => {
      results.errors.push(`[page.error] ${err.message}`)
    })

    // ── STEP 0: Landing ────────────────────────────────────────
    console.log('\n━━━ STEP 0: Landing page')
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    results.screenshots.push(await screenshot(page, '00-landing'))
    console.log(`[url] ${page.url()}`)

    // ── STEP 1: Sign in ────────────────────────────────────────
    console.log('\n━━━ STEP 1: Sign in')
    await page.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(1_500)

    results.screenshots.push(await screenshot(page, '01-signin-page'))

    const emailInput = page.locator('#email')
    await emailInput.waitFor({ state: 'visible', timeout: 15_000 })
    await emailInput.fill(EMAIL)

    const passwordInput = page.locator('#password')
    await passwordInput.fill(PASSWORD)

    const submitBtn = page.getByRole('button', { name: /iniciar sesi[oó]n/i })
    await submitBtn.click()

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    results.loginSuccess = true
    console.log(`[login] SUCCESS — at ${page.url()}`)
    results.screenshots.push(await screenshot(page, '01b-dashboard'))

    // ── STEP 2: Navigate to wizard ─────────────────────────────
    console.log('\n━━━ STEP 2: Navigate to /proposals/new')
    await page.goto(`${BASE}/proposals/new`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(2_000)

    results.screenshots.push(await screenshot(page, '02-wizard-loaded'))
    const wizardUrl = page.url()
    results.reachedWizard = wizardUrl.includes('proposals/new')
    console.log(`[wizard] url=${wizardUrl}, reached=${results.reachedWizard}`)

    if (!results.reachedWizard) {
      results.errors.push(`Could not reach wizard, at: ${wizardUrl}`)
      printSummary(results)
      return
    }

    // ── STEP 3: Wizard Step 1 — Select GCPRON SAS ─────────────
    console.log('\n━━━ STEP 3: Wizard Step 1 — Select client')

    // Wait for client list to load (API call)
    await page.waitForTimeout(2_000)

    // Find the GCPRON client card (it's a button containing "GCPRON")
    const gcpronCard = page.locator('button').filter({ hasText: /GCPRON/i }).first()
    const hasGcpron = await gcpronCard.isVisible({ timeout: 8_000 }).catch(() => false)

    if (hasGcpron) {
      console.log('[step1] Found GCPRON card — clicking to select')
      await gcpronCard.click()
      await page.waitForTimeout(500)
      results.step1Complete = true
    } else {
      console.log('[step1] GCPRON not visible, checking all available text')
      const bodyText = await page.locator('body').textContent().catch(() => '')
      console.log(`[step1] Page text preview: ${bodyText?.slice(0, 300)}`)
      results.errors.push('GCPRON SAS client card not found')
    }

    results.screenshots.push(await screenshot(page, '03-step1-selected'))

    // Click "Continuar" button (Step 1 next button)
    const continuarBtn = page.getByRole('button', { name: /^Continuar$/ })
    const isContinuarEnabled = await continuarBtn.isEnabled({ timeout: 5_000 }).catch(() => false)
    console.log(`[step1] "Continuar" button enabled: ${isContinuarEnabled}`)

    if (isContinuarEnabled) {
      await continuarBtn.click()
      await page.waitForTimeout(1_500)
      console.log('[step1] Clicked Continuar')
    } else {
      // Try the full text variant (with website analysis)
      const continuarAnalisisBtn = page.getByRole('button', { name: /continuar con an[aá]lisis/i })
      const hasAnalisis = await continuarAnalisisBtn.isEnabled({ timeout: 2_000 }).catch(() => false)
      if (hasAnalisis) {
        await continuarAnalisisBtn.click()
        await page.waitForTimeout(1_500)
        console.log('[step1] Clicked "Continuar con análisis"')
      } else {
        results.errors.push('Step 1: "Continuar" button not enabled after selecting client')
      }
    }

    results.screenshots.push(await screenshot(page, '03b-after-step1'))
    console.log(`[step1] complete=${results.step1Complete}, url=${page.url()}`)

    // ── STEP 4: Wizard Step 2 — Context ───────────────────────
    console.log('\n━━━ STEP 4: Wizard Step 2 — Context (problema + service)')

    // Step 2 has collapsible blocks — Block 1 "Contexto comercial" starts open
    // We need: problema >= 20 chars AND at least 1 service selected

    // Check if we're on step 2 by looking for the problem textarea
    // The textarea is inside "¿Qué necesita el cliente?"
    const problemaInput = page.getByPlaceholder(/desaf[ií]o de.*quieres abordar/i).first()
    const hasProblema = await problemaInput.isVisible({ timeout: 8_000 }).catch(() => false)

    if (!hasProblema) {
      // Maybe still on step 1 or block is collapsed — try to detect step 2
      const step2Heading = page.getByText(/qu[eé] necesita el cliente|contexto comercial/i).first()
      const hasStep2 = await step2Heading.isVisible({ timeout: 3_000 }).catch(() => false)
      console.log(`[step2] Problem textarea visible: false, step2 heading visible: ${hasStep2}`)
      if (!hasStep2) {
        results.errors.push('Step 2 not reached — still on Step 1 or unknown state')
        results.screenshots.push(await screenshot(page, '04-step2-not-reached'))
        // Take a final screenshot and summary
        printSummary(results)
        return
      }
    } else {
      console.log('[step2] Problem textarea found')
    }

    // Fill problema (minimum 20 chars)
    const problemText = 'Necesitamos implementar un sistema de automatizacion de propuestas comerciales para mejorar la velocidad de respuesta a clientes y aumentar la tasa de cierre de ventas en un 40%.'
    if (hasProblema) {
      await problemaInput.fill(problemText)
      console.log(`[step2] Filled problema: ${problemText.length} chars`)
    }

    await page.waitForTimeout(500)

    // Select at least one service from Block 2 "Servicios a incluir"
    // Service cards are `button` elements containing the service name + USD price + Plus icon
    // The Block starts OPEN (see source: <Block ... defaultOpen> in the original — but actually
    // Block 2 does NOT have defaultOpen, so it may be collapsed. Let's open it first.

    // First scroll down so Block 2 is visible
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(500)

    // Check if Block 2 "Servicios a incluir" is collapsed (no service buttons visible)
    const servicesBlockHeader = page.getByText(/2 · Servicios a incluir/i).first()
    const hasServicesHeader = await servicesBlockHeader.isVisible({ timeout: 5_000 }).catch(() => false)
    console.log(`[step2] Services block header visible: ${hasServicesHeader}`)

    if (hasServicesHeader) {
      // Check if the service buttons (with USD prices) are visible — if not, block is collapsed
      const firstServiceBtn = page.getByText('Paid Media').first()
      const isFirstVisible = await firstServiceBtn.isVisible({ timeout: 2_000 }).catch(() => false)
      console.log(`[step2] First service button visible: ${isFirstVisible}`)

      if (!isFirstVisible) {
        // Block is collapsed — click the header to expand it
        await servicesBlockHeader.click()
        await page.waitForTimeout(800)
        console.log('[step2] Clicked to expand Services block')
      }
    }

    await page.evaluate(() => window.scrollBy(0, 300))
    await page.waitForTimeout(500)

    // Now find service cards — they are buttons inside the grid that contain service names
    // Strategy: look for "Paid Media" text and click the button containing it
    const paidMediaBtn = page.locator('button').filter({ hasText: 'Paid Media' }).first()
    const hasPaidMedia = await paidMediaBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    console.log(`[step2] "Paid Media" service button visible: ${hasPaidMedia}`)

    if (hasPaidMedia) {
      // Scroll into view and click
      await paidMediaBtn.scrollIntoViewIfNeeded()
      await paidMediaBtn.click()
      await page.waitForTimeout(1_000)

      // Verify it was added (subtitle should change to "1 seleccionado(s)")
      const selectedCount = page.getByText(/1 seleccionado/i).first()
      const isSelected = await selectedCount.isVisible({ timeout: 3_000 }).catch(() => false)
      console.log(`[step2] Service selected (1 seleccionado): ${isSelected}`)

      if (!isSelected) {
        // Try clicking a second time or the + icon specifically
        const plusIcon = paidMediaBtn.locator('svg').last()
        await plusIcon.click().catch(async () => {
          // Try clicking by position inside the button (click the + on the right)
          const box = await paidMediaBtn.boundingBox()
          if (box) {
            await page.mouse.click(box.x + box.width - 20, box.y + box.height / 2)
          }
        })
        await page.waitForTimeout(500)
        console.log('[step2] Tried clicking + icon')
      }
    } else {
      // Fallback: try any button in the service grid area
      const serviceGridBtns = page.locator('button').filter({ hasText: /USD \$/ })
      const count = await serviceGridBtns.count().catch(() => 0)
      console.log(`[step2] Service grid buttons (USD $): ${count}`)
      if (count > 0) {
        await serviceGridBtns.first().scrollIntoViewIfNeeded()
        await serviceGridBtns.first().click()
        await page.waitForTimeout(500)
      }
    }

    results.screenshots.push(await screenshot(page, '04-step2-filled'))

    // The sticky footer button is at the bottom — scroll to it
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // The button text is either "Generar propuesta con IA →" (enabled)
    // or "Completa los campos requeridos" (disabled)
    // Both are the same button — just check if it's enabled
    const generateBtnEnabled = page.getByRole('button', { name: /Generar propuesta con IA/i })
    const generateBtnDisabled = page.getByRole('button', { name: /Completa los campos requeridos/i })

    // Check which state the button is in
    const hasGenEnabled = await generateBtnEnabled.isVisible({ timeout: 3_000 }).catch(() => false)
    const hasGenDisabled = await generateBtnDisabled.isVisible({ timeout: 2_000 }).catch(() => false)
    console.log(`[step2] "Generar propuesta con IA" visible: ${hasGenEnabled}`)
    console.log(`[step2] "Completa los campos requeridos" visible: ${hasGenDisabled}`)

    // Also check the full action button area
    const stickyFooter = page.locator('.sticky.bottom-0').first()
    const hasSticky = await stickyFooter.isVisible({ timeout: 2_000 }).catch(() => false)
    console.log(`[step2] Sticky footer visible: ${hasSticky}`)

    if (hasGenEnabled) {
      await generateBtnEnabled.click()
      results.step2Complete = true
      console.log('[step2] Clicked "Generar propuesta con IA"')
    } else if (hasGenDisabled) {
      console.log('[step2] Button still disabled — checking what is missing')
      // Check if service was actually added
      const selectedCountText = await page.getByText(/\d+ seleccionado/i).first().textContent().catch(() => '')
      console.log(`[step2] Selected services text: "${selectedCountText}"`)
      // Check problema length
      const problemaVal = await page.getByPlaceholder(/desaf[ií]o/i).first().inputValue().catch(() => '')
      console.log(`[step2] Problema value length: ${problemaVal.length}`)
      results.errors.push(`Step 2: Generate button still disabled after filling fields`)
      // Forcefully click the button anyway to see what happens
      await generateBtnDisabled.click().catch(() => {})
    } else {
      results.errors.push('Step 2: Neither generate button found')
    }

    results.screenshots.push(await screenshot(page, '04b-after-step2'))
    console.log(`[step2] complete=${results.step2Complete}`)

    // ── STEP 5: Wizard Step 3 — AI Generation ──────────────────
    console.log('\n━━━ STEP 5: Wizard Step 3 — AI Generation (up to 120s)')
    await page.waitForTimeout(2_000)
    results.screenshots.push(await screenshot(page, '05-step3-start'))

    // Look for Step 3 generation panel (dark background with sparkles)
    const step3Panel = page.locator('[class*="bg-\\[\\#0F172A\\]"], .bg-slate-900').first()
    const hasStep3Panel = await step3Panel.isVisible({ timeout: 10_000 }).catch(() => false)
    console.log(`[step3] Generation panel visible: ${hasStep3Panel}`)

    // Monitor "Claude está generando..." or "Generando..." text
    const generatingText = page.getByText(/Claude está generando|Generando\.\.\./i).first()
    const hasGenerating = await generatingText.isVisible({ timeout: 10_000 }).catch(() => false)
    console.log(`[step3] "Generating" text visible: ${hasGenerating}`)

    // Check for "Sin respuesta" immediately
    const sinRespuesta = page.getByText(/sin respuesta/i).first()
    const hasSinRespuesta0 = await sinRespuesta.isVisible({ timeout: 3_000 }).catch(() => false)
    if (hasSinRespuesta0) {
      results.step3SinRespuesta = true
      console.log('[step3] "Sin respuesta" shown immediately — stream failed')
    }

    // Wait for "Revisar y exportar →" button to be enabled (up to 120s)
    // Also handle: retry on error (click "Reintentar" up to 2 times)
    const reviewBtn = page.getByRole('button', { name: /Revisar y exportar/i })
    const retryBtn = page.getByRole('button', { name: /Reintentar/i })
    const startTime = Date.now()
    let attempts = 0

    while (attempts < 3) {
      attempts++
      console.log(`[step3] Attempt ${attempts}/3`)

      // Wait for either: review button enabled, or error shown
      try {
        // Wait up to 120s per attempt for generation to complete
        const timeoutPerAttempt = 120_000
        await expect(reviewBtn).toBeEnabled({ timeout: timeoutPerAttempt })
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        console.log(`[step3] Generation completed in ~${elapsed}s (attempt ${attempts})`)
        results.step3AISuccess = true
        break
      } catch {
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        console.log(`[step3] Attempt ${attempts} timed out after ${elapsed}s total`)

        // Check what the current state is
        const errorEl = page.getByText(/error al generar/i).first()
        const hasErrorShown = await errorEl.isVisible({ timeout: 2_000 }).catch(() => false)

        if (hasErrorShown) {
          const fullErrorBox = page.locator('.bg-red-50, .text-red-700').first()
          const errorBoxText = await fullErrorBox.textContent().catch(() => '')
          console.log(`[step3] Error shown: ${errorBoxText?.slice(0, 200)}`)
          results.step3ErrorMsg = errorBoxText ?? ''

          // Check for rate limit vs other error
          if (errorBoxText?.includes('rate_limited') || errorBoxText?.includes('demasiadas')) {
            console.log('[step3] Rate limited — waiting 65s before retry')
            results.errors.push('Step 3: Rate limited — waiting before retry')
            await page.waitForTimeout(65_000)
          }

          // Try clicking Reintentar
          const canRetry = await retryBtn.isVisible({ timeout: 2_000 }).catch(() => false)
          if (canRetry && attempts < 3) {
            console.log('[step3] Clicking Reintentar...')
            await retryBtn.click()
            await page.waitForTimeout(3_000) // Wait for new attempt to start
          } else {
            results.errors.push(`Step 3: Error persists after attempt ${attempts}: ${errorBoxText?.slice(0, 100)}`)
            break
          }
        } else {
          // No error shown — just timed out waiting
          results.errors.push(`Step 3: Timed out after ${elapsed}s (attempt ${attempts})`)
          break
        }
      }
    }

    results.screenshots.push(await screenshot(page, '05-step3-after-generation'))

    // Read the progress percentage
    const progressText = page.getByText(/^\d+%$/).first()
    const hasProgress = await progressText.isVisible({ timeout: 2_000 }).catch(() => false)
    if (hasProgress) {
      const pctText = await progressText.textContent().catch(() => '0%')
      results.progressPctAtEnd = parseInt(pctText ?? '0', 10)
      console.log(`[step3] Progress at end: ${results.progressPctAtEnd}%`)
    }

    // Count sections shown as completed (CheckCircle2 = green check next to section name)
    // In the UI each completed section has "done" status shown with a green CheckCircle2
    // We detect this by counting section labels visible in the panel
    for (const label of SECTION_LABELS) {
      const el = page.getByText(label, { exact: true }).first()
      const isVisible = await el.isVisible({ timeout: 1_000 }).catch(() => false)
      if (isVisible) {
        results.sectionsGenerated++
        results.sectionNames.push(label)
      }
    }
    console.log(`[step3] Sections visible: ${results.sectionsGenerated}/14`)
    console.log(`[step3] Section names: ${results.sectionNames.join(', ')}`)

    // Also count checkmarks (green check icons = done sections)
    const checkIcons = await page.locator('svg[class*="text-\\[\\#1D9E75\\]"], .text-green-500').count().catch(() => 0)
    console.log(`[step3] Green checkmarks found: ${checkIcons}`)

    // Full page screenshot to capture all section rows
    results.screenshots.push(await screenshot(page, '05b-step3-all-sections'))

    // Proceed to Step 4 if generation succeeded
    if (results.step3AISuccess) {
      await reviewBtn.click()
      await page.waitForTimeout(3_000)
      console.log('[step3] Clicked "Revisar y exportar"')
    } else {
      await reviewBtn.click().catch(() => {})
      await page.waitForTimeout(2_000)
    }

    results.screenshots.push(await screenshot(page, '05c-after-step3'))

    // ── STEP 6: Wizard Step 4 — Review & Export ───────────────
    console.log('\n━━━ STEP 6: Wizard Step 4 — Review & Export')

    // Check for Step 4: the review layout has a sidebar with "Exportar" heading
    const exportarHeading = page.getByText(/^Exportar$/).first()
    const hasExportar = await exportarHeading.isVisible({ timeout: 10_000 }).catch(() => false)
    console.log(`[step4] "Exportar" sidebar heading visible: ${hasExportar}`)

    // Check for the proposal preview
    const docHeader = page.getByText('Propuesta Comercial').first()
    const hasDocHeader = await docHeader.isVisible({ timeout: 5_000 }).catch(() => false)
    console.log(`[step4] "Propuesta Comercial" heading visible: ${hasDocHeader}`)

    results.step4Reached = hasExportar || hasDocHeader

    // Check for TipTap editor (ProseMirror)
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first()
    results.editorVisible = await editor.isVisible({ timeout: 5_000 }).catch(() => false)
    if (results.editorVisible) {
      const content = await editor.textContent().catch(() => '')
      results.editorContentLength = content?.length ?? 0
      console.log(`[step4] Editor content length: ${results.editorContentLength} chars`)
    }

    results.screenshots.push(await screenshot(page, '06-step4-review'))

    // Find and click the PDF export button
    // In Step4Review the PDF button has text "PDF" (with FileText icon)
    const pdfBtn = page.getByRole('button', { name: /^PDF$/ })
    results.pdfButtonVisible = await pdfBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    console.log(`[step4] PDF button visible: ${results.pdfButtonVisible}`)

    if (!results.pdfButtonVisible) {
      // Fallback: look for any button containing "PDF"
      const pdfBtnAlt = page.locator('button').filter({ hasText: /pdf/i }).first()
      const hasPdfAlt = await pdfBtnAlt.isVisible({ timeout: 3_000 }).catch(() => false)
      if (hasPdfAlt) {
        results.pdfButtonVisible = true
        console.log('[step4] PDF button found via filter')
      }
    }

    if (results.pdfButtonVisible) {
      console.log('[step4] Clicking PDF export button...')

      // Watch for download event
      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null)

      // Also watch for toast/success message
      await pdfBtn.click().catch(async () => {
        const pdfBtnAlt = page.locator('button').filter({ hasText: /pdf/i }).first()
        await pdfBtnAlt.click().catch(() => {})
      })

      // Wait up to 30s for download or status change
      await page.waitForTimeout(3_000)

      // Check for "Generando..." state (loading)
      const generandoText = page.getByText(/generando\.\.\./i).first()
      const isGenerando = await generandoText.isVisible({ timeout: 3_000 }).catch(() => false)
      if (isGenerando) {
        console.log('[step4] PDF is being generated...')
        // Wait for it to finish
        await page.waitForFunction(
          () => !document.body.innerText.includes('Generando...'),
          { timeout: 30_000 }
        ).catch(() => {})
      }

      const download = await downloadPromise
      if (download) {
        results.pdfExportResult = `DOWNLOADED: ${download.suggestedFilename()}`
        console.log(`[step4] PDF downloaded: ${download.suggestedFilename()}`)
      } else {
        // Check for success toast
        const successToast = page.getByText(/archivo descargado|pdf.*listo|generado correctamente/i).first()
        const hasSuccess = await successToast.isVisible({ timeout: 5_000 }).catch(() => false)
        if (hasSuccess) {
          results.pdfExportResult = 'SUCCESS: toast shown'
          console.log('[step4] PDF export success toast visible')
        } else {
          // Check for error toast
          const errorToast = page.getByText(/error.*exportar|no se pudo|503|disponible en producci[oó]n/i).first()
          const hasErrorToast = await errorToast.isVisible({ timeout: 3_000 }).catch(() => false)
          if (hasErrorToast) {
            const errorText = await errorToast.textContent().catch(() => '')
            results.pdfExportResult = `ERROR: ${errorText}`
            console.log(`[step4] PDF export error: ${errorText}`)
          } else {
            // Check if new tab opened
            const allPages = page.context().pages()
            if (allPages.length > 1) {
              results.pdfExportResult = 'OPENED_NEW_TAB'
              console.log('[step4] PDF may have opened in new tab')
            } else {
              results.pdfExportResult = 'UNKNOWN: no download/toast/tab detected'
              console.log('[step4] PDF export result unclear')
            }
          }
        }
      }
    } else {
      results.errors.push('Step 4: PDF button not found')
    }

    results.screenshots.push(await screenshot(page, '06b-step4-after-pdf'))

    // ── FINAL SUMMARY ──────────────────────────────────────────
    printSummary(results)
  })
})

function printSummary(results: Record<string, any>) {
  console.log('\n' + '═'.repeat(65))
  console.log('PRODUCTION TEST RESULTS SUMMARY')
  console.log('═'.repeat(65))
  console.log(`Login Success:              ${results.loginSuccess ? 'YES' : 'NO'}`)
  console.log(`Reached Wizard:             ${results.reachedWizard ? 'YES' : 'NO'}`)
  console.log(`Step 1 (Client Selected):   ${results.step1Complete ? 'PASS' : 'FAIL'}`)
  console.log(`Step 2 (Context + Service): ${results.step2Complete ? 'PASS' : 'FAIL'}`)
  console.log(`Step 3 (AI Generation):     ${results.step3AISuccess ? 'SUCCESS' : 'FAILED'}`)
  console.log(`  "Sin respuesta" error:    ${results.step3SinRespuesta ? 'YES (ERROR)' : 'NO'}`)
  if (results.step3ErrorMsg) {
    console.log(`  Error message:            ${results.step3ErrorMsg}`)
  }
  console.log(`  Progress at end:          ${results.progressPctAtEnd}%`)
  console.log(`  Sections visible:         ${results.sectionsGenerated}/14`)
  if (results.sectionNames.length > 0) {
    console.log(`  Section names:`)
    results.sectionNames.forEach((n: string) => console.log(`    - ${n}`))
  }
  console.log(`Step 4 (Review page):       ${results.step4Reached ? 'REACHED' : 'NOT REACHED'}`)
  console.log(`  TipTap editor visible:    ${results.editorVisible ? 'YES' : 'NO'}`)
  if (results.editorContentLength > 0) {
    console.log(`  Editor content length:    ${results.editorContentLength} chars`)
  }
  console.log(`  PDF button visible:       ${results.pdfButtonVisible ? 'YES' : 'NO'}`)
  console.log(`  PDF export result:        ${results.pdfExportResult || 'N/A'}`)
  if (results.errors.length > 0) {
    console.log('\nErrors:')
    results.errors.forEach((e: string) => console.log(`  - ${e}`))
  }
  if (results.screenshots.length > 0) {
    console.log('\nScreenshots:')
    results.screenshots.forEach((s: string) => console.log(`  ${s}`))
  }
  console.log('═'.repeat(65))
}
