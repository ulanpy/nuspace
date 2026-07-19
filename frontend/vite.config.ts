import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Dev-only: allow tunnel domains used by cloudflared.
    allowedHosts: true,
    watch: {
      // Docker bind mounts can miss FS events without polling.
      usePolling: true,
      interval: 150,
    },
    proxy: {
      '/api': {
        target: 'http://fastapi:8000',
        changeOrigin: true,
      },
    },
    hmr: {
      timeout: 30000,
      overlay: true,
    },
  },
  build: {
    outDir: 'out',
    emptyOutDir: true,
  },
})
