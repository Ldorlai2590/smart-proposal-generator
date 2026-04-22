import { defineConfig, devices } from '@playwright/test'

/**
 * SmartSPG E2E tests — corre 2 usuarios en paralelo contra Vercel o localhost.
 *
 * Uso:
 *   # Contra Vercel (producción)
 *   BASE_URL=https://smart-proposal-generator-lyart.vercel.app npx playwright test --headed
 *
 *   # Contra dev local
 *   BASE_URL=http://localhost:3000 npx playwright test --ui
 *
 *   # Solo un usuario
 *   npx playwright test user-a --headed
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000, // streaming AI puede tardar
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2, // los 2 usuarios en paralelo
  reporter: [
    ['list'],
    ['html', { open: 'on-failure', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results',
})
