import { defineConfig, devices } from '@playwright/test'

// 브라우저 스모크 테스트: chromium 하나, vite 개발 서버(5190). 백엔드는 쓰지 않는다 (e2e/mock.ts 가 /api 를 가짜로 답한다)
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:5190', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5190 --strictPort',
    url: 'http://localhost:5190',
    reuseExistingServer: !process.env.CI,
  },
})
