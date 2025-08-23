// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import path from "path";
// Parse tunnel URL from environment variable
const tunnelUrl = process.env.CLOUDFLARED_TUNNEL_URL || 'http://localhost:5173';
const tunnelHost = tunnelUrl ? new URL(tunnelUrl).hostname : 'localhost';
const tunnelProtocol = tunnelUrl ? new URL(tunnelUrl).protocol : 'http:';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Use the tunnel URL from environment variable
    "import.meta.env.VITE_BASE_URL": JSON.stringify(tunnelUrl),
  },
  server: {
    host: "0.0.0.0", // Correct: Listen on all interfaces inside the container
    port: 5173, // Correct: Match Dockerfile and Nginx proxy
    strictPort: true,
    watch: {
      usePolling: true, // Correct for Docker environments
    },
    proxy: {
      // This proxies requests *from* the Vite dev server, e.g., if your React code calls /api
      "/api": {
        target: "http://fastapi:8000", // Target the internal service name
        changeOrigin: true,
        // You might not need the proxy here if Nginx handles all /api calls
        // If your React code directly calls fetch('/api/...'), Nginx will catch it first.
        // This proxy is useful if React code calls, e.g., fetch('http://localhost:5173/api/...')
      },
    },
    // --- Add this ---
    allowedHosts: true, //not for production!!!!!!!!!
    // --- Configure HMR ---
    hmr: {
      // For tunnel setup, we need to configure HMR to work through the tunnel
      clientPort: tunnelProtocol === "https:" ? 443 : 80,
      host: tunnelHost,
      protocol: tunnelProtocol === "https:" ? "wss" : "ws",
      timeout: 30000,
      overlay: true,
    },
    // --- End added section ---
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
