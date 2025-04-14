// frontend/vite.config.js
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
    // Consider if VITE_BASE_URL should reflect the tunnel or just be for API proxy path
    "import.meta.env.VITE_BASE_URL": JSON.stringify("localhost"),
  },
  server: {
    host: "0.0.0.0",       // Correct: Listen on all interfaces inside the container
    port: 5173,            // Correct: Match Dockerfile and Nginx proxy
    strictPort: true,
    watch: {
      usePolling: true,    // Correct for Docker environments
    },
    proxy: {
      // This proxies requests *from* the Vite dev server, e.g., if your React code calls /api
      "/api": {
        target: "http://fastapi:8000", // Target the internal service name
        changeOrigin: true,
        // You might not need the proxy here if Nginx handles all /api calls
        // If your React code directly calls fetch('/api/...'), Nginx will catch it first.
        // This proxy is useful if React code calls, e.g., fetch('http://localhost:5173/api/...')
      }
    },
    // --- Add this ---
    allowedHosts: true, //not for production!!!!!!!!!
    // --- Configure HMR ---
    hmr: {
      // Instruct the client-side HMR code to connect back through the public port
      // Assuming your Cloudflare tunnel serves traffic on standard HTTPS port 443
      clientPort: 80,
      // If your tunnel is HTTP only (port 80), use clientPort: 80
    }
    // --- End added section ---
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