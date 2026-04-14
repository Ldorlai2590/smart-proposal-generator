import { test, expect, signUp, doOnboarding, createClient, runProposalWizard } from './fixtures'

const user = {
  label: 'Usuario A — Tech Consulting',
  email: `alice+clerk_test+${Date.now()}@smartspg.dev`,
  password: 'AliceTest123!Secure',
  orgName: 'Acme Tech Consulting LATAM',
  clientName: 'María González',
  clientCompany: 'FinTech Latam SA',
  clientEmail: 'maria@fintechlatam.com',
  clientIndustry: 'Fintech',
  companySize: '51-200',
  problema:
    'Necesitamos migrar nuestro core bancario de un monolito legacy en COBOL a una arquitectura de microservicios cloud-native en AWS. El sistema actual tiene 180k líneas, procesa 2M tx/día y tiene downtime mensual de ~4 horas.',
  budget: 150000,
  timelineWeeks: 16,
  templateIndustry: 'Tecnología',
}

test.use({ profile: user })

test.describe('Usuario A — Tech Consulting LATAM', () => {
  test('flujo completo: signup → onboarding → cliente → propuesta', async ({ page }) => {
    console.log(`\n🔵 ${user.label} | email: ${user.email}`)

    await test.step('1. Landing page', async () => {
      await page.goto('/')
      await expect(page).toHaveTitle(/SmartSPG|Smart Proposal/i)
      await page.screenshot({ path: 'test-results/user-a-01-landing.png', fullPage: true })
    })

    await test.step('2. Sign up con Clerk test mode', async () => {
      await signUp(page, user)
      await page.screenshot({ path: 'test-results/user-a-02-after-signup.png', fullPage: true })
    })

    await test.step('3. Onboarding (skip)', async () => {
      await doOnboarding(page, user, true)
      await expect(page).toHaveURL(/\/dashboard/)
      await page.screenshot({ path: 'test-results/user-a-03-dashboard.png', fullPage: true })
    })

    await test.step('4. Crear cliente FinTech', async () => {
      await createClient(page, user)
      await page.screenshot({ path: 'test-results/user-a-04-client-created.png', fullPage: true })
    })

    await test.step('5. Wizard de propuesta (4 pasos)', async () => {
      await runProposalWizard(page, user)
      await page.screenshot({ path: 'test-results/user-a-05-proposal-done.png', fullPage: true })
    })

    await test.step('6. Volver al listado de propuestas', async () => {
      await page.goto('/proposals')
      await expect(page.getByText(user.clientCompany).first()).toBeVisible({ timeout: 10_000 })
      await page.screenshot({ path: 'test-results/user-a-06-proposals-list.png', fullPage: true })
    })

    console.log(`✅ ${user.label} completó el flujo sin errores`)
  })
})
