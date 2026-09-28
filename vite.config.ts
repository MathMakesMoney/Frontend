import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 개발 서버: /api, /mcp 를 백엔드(8080)로 프록시
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/mcp': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'node',
  },
})
