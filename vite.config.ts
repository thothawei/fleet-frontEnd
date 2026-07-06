import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 開發時透過 proxy 轉發到 line-fleet-dispatch（:8080），避免跨域問題
const BACKEND = 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/ws': { target: BACKEND, ws: true, changeOrigin: true },
    },
  },
})
