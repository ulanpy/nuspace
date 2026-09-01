import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Inside Docker the backend is reachable as `fastapi:8000`; from the host it is
// nginx on :80 that proxies /api through. Override with VITE_API_PROXY_TARGET.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost"

export default defineConfig({
  plugins: [
    // Must precede the react plugin so generated route files get transformed.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    /**
     * `out`, not Vite's default `dist`.
     *
     * The deployment path expects `out/` in four places — the CI tar step, the
     * ansible unpack task, the production compose mount and nginx's root — and
     * they were built around the old app, whose Next-era config produced `out`.
     * Renaming here is one line against four, and any of those four drifting
     * silently serves an empty directory rather than failing.
     */
    outDir: "out",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Docker bind mounts can miss FS events without polling.
    watch: { usePolling: true, interval: 150 },
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
})
