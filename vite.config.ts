import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The account service runs on its own port; the dev server proxies the API to it
// so the browser talks to a single origin, exactly as it does in production.
const accountService = process.env.EACH_ACCOUNT_URL || 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base: works on github.io/each/ and each.nonarkara.org without rebuild
  base: './',
  server: {
    host: '127.0.0.1',
    allowedHosts: ['each.localhost'],
    proxy: {
      // Fail fast when the account service is not running: the app falls back to
      // browser storage instead of hanging the sign-in screen.
      '/api': { target: accountService, changeOrigin: false, timeout: 8000, proxyTimeout: 8000 },
    },
  },
})
