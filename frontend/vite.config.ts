import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Os servidores Playwright de API e demonstração têm módulos de ambiente distintos.
  // Caches separados evitam invalidações e recargas entre as duas instâncias.
  cacheDir:
    process.env.VITE_CACHE_DIR ||
    `.cache/vite-${process.env.VITE_DATA_MODE === 'demo' ? 'demo' : 'api'}`,
  plugins: [react(), tailwindcss()],
  // HTML snapshots and traces must not become dependency entry points or trigger SPA reloads.
  optimizeDeps: { entries: ['index.html'] },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    watch: {
      ignored: [
        '**/.cache/**',
        '**/test-results/**',
        '**/playwright-report/**',
      ],
    },
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
