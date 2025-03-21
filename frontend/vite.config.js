import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
  base: "/",  // ⬅️ Ensures paths resolve correctly in dev mode
});