import { test, expect, signUp, doOnboarding, createClient, runProposalWizard } from './fixtures'

const user = {
  label: 'Usuario B — Marketing Agency',
  email: `bruno+clerk_test+${Date.now()}@smartspg.dev`,
  password: 'BrunoTest456!Secure',
  orgName: 'Estudio Bruno — Digital Growth',
  clientName: 'Carlos Ramírez',
  clientCompany: 'Retail Andino SAS',
  clientEmail: 'cramirez@retailandino.co',
  clientIndustry: 'Retail',
  companySize: '201-500',
  problema:
    'Nuestro e-commerce factura USD 8M/año con CAC creciendo 40% YoY. Necesitamos una estrategia de performance marketing full-funnel: SEO técnico, Google/Meta Ads escalables, CRM automation y analytics unificado en GA4 + Looker para bajar el CAC 30% en 6 meses.',
  budget: 45000,
  timelineWeeks: 12,
  templateIndustry: 'Marketing',
}

test.use({ profile: user })

test.describe('Usuario B — Agencia de Marketing Digital', () => {
  test('flujo completo: signup → onboarding → cliente → propuesta', async ({ page }) => {
    console.log(`\n🟢 ${user.label} | email: ${user.email}`)

    await test.step('1. Landing page', async () => {
      await page.goto('/')
      await expect(page).toHaveTitle(/SmartSPG|Smart Proposal/i)
      await page.screenshot({ path: 'test-results/user-b-01-landing.png', fullPage: true })
    })

    await test.step('2. Sign up con Clerk test mode', async () => {
      await signUp(page, user)
      await page.screenshot({ path: 'test-results/user-b-02-after-signup.png', fullPage: true })
    })

    await test.step('3. Onboarding completo (sin skip)', async () => {
      await doOnboarding(page, user, false)
      await expect(page).toHaveURL(/\/dashboard/)
      await page.screenshot({ path: 'test-results/user-b-03-dashboard.png', fullPage: true })
    })

    await test.step('4. Crear cliente Retail', async () => {
      await createClient(page, user)
      await page.screenshot({ path: 'test-results/user-b-04-client-created.png', fullPage: true })
    })

    await test.step('5. Wizard de propuesta (4 pasos)', async () => {
      await runProposalWizard(page, user)
      await page.screenshot({ path: 'test-results/user-b-05-proposal-done.png', fullPage: true })
    })

    await test.step('6. Verificar analytics muestra la propuesta nueva', async () => {
      await page.goto('/analytics')
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/user-b-06-analytics.png', fullPage: true })
    })

    console.log(`✅ ${user.label} completó el flujo sin errores`)
  })
})
