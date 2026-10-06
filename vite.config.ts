import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base: works on github.io/each/ and each.nonarkara.org without rebuild
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: ['127.0.0.1', 'localhost', 'each.localhost'],
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    allowedHosts: ['127.0.0.1', 'localhost', 'each.localhost'],
  },
})
