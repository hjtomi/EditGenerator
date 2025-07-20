// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', // Directory for your tests
  fullyParallel: true, // Run tests in files in parallel
  forbidOnly: !!process.env.CI, // Disallow .only on CI
  retries: process.env.CI ? 2 : 0, // Retry on CI
  workers: process.env.CI ? 1 : undefined, // Opt out of parallel tests on CI.
  reporter: 'html', // Reporter to use. See https://playwright.dev/docs/test-reporters
  use: {
    // Base URL to use in your tests (e.g., your local dev server)
    baseURL: 'http://localhost:3000', // Or whatever your dev server runs on

    trace: 'on-first-retry', // Collect trace when retrying a failed test
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server to start before running tests (for your Next.js app)
  webServer: {
    command: 'npm run dev', // Or 'npm start' for a build
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // Don't start a new server if one is already running
  },
});