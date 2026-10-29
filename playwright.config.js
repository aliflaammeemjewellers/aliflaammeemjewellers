import { defineConfig } from '@playwright/test';
// The bundled Chromium ships with the shared libraries it needs; this flag
// makes the package extract them and set LD_LIBRARY_PATH in the sandbox.
process.env.AWS_EXECUTION_ENV ||= 'AWS_Lambda_nodejs22.x';
const { default: chromium } = await import('@sparticuz/chromium');

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1360, height: 960 },
    launchOptions: { executablePath: await chromium.executablePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] },
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/admin.html',
    reuseExistingServer: false,
    timeout: 15000
  }
});
