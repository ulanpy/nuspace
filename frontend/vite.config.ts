import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from 'tailwindcss'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    "import.meta.env.VITE_BASE_URL": JSON.stringify("localhost"),
  },
  server: {
    host: "0.0.0.0",       // Allow access from Docker network
    port: 5173,            // Consistent with Docker-exposed port
    strictPort: true,      // Fail if port is already in use
    watch: {
      usePolling: true,    // Docker-friendly file watching
    },
    proxy: {
      "/api": {
        target: "http://fastapi:8000",
        changeOrigin: true,
      }
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
      ],
    },
  },
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
