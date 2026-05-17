import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const tunnelUrl = process.env.VITE_BASE_URL || 'http://localhost:5173'
const tunnelHost = new URL(tunnelUrl).hostname
const tunnelProtocol = new URL(tunnelUrl).protocol

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
      host: tunnelHost,
      protocol: tunnelProtocol === 'https:' ? 'wss' : 'ws',
      clientPort: tunnelProtocol === 'https:' ? 443 : 80,
      timeout: 30000,
      overlay: true,
    },
  },
  build: {
    outDir: 'out',
    emptyOutDir: true,
  },
})
