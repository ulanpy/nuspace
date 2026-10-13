import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite-plus"

import workbench from "./ui-workbench.config"

/** Paths in the config are relative to the app root, the parent of this folder. */
const fromAppRoot = (path: string) =>
  fileURLToPath(new URL(`../${path}`, import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: Object.fromEntries(
      Object.entries(workbench.alias).map(([key, path]) => [
        key,
        fromAppRoot(path),
      ])
    ),
  },
})
