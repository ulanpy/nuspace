import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, lazyPlugins } from "vite-plus"

// Inside Docker the backend is reachable as `fastapi:8000`; from the host it is
// nginx on :80 that proxies /api through. Override with VITE_API_PROXY_TARGET.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost"

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: [
      "out/",
      "coverage/",
      "src/api/schema.d.ts",
      "src/routeTree.gen.ts",
    ],
    plugins: ["react", "typescript", "oxc", "jsx-a11y", "import"],
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "import/no-unassigned-import": "off",
      "vite-plus/prefer-vite-plus-imports": "error",
      "react/rules-of-hooks": "error",
      "react/only-export-components": ["warn", { allowConstantExport: true }],
      "@tanstack/query/exhaustive-deps": "error",
      "@tanstack/query/infinite-query-property-order": "error",
      "@tanstack/query/mutation-property-order": "error",
      "@tanstack/query/no-rest-destructuring": "warn",
      "@tanstack/query/no-unstable-deps": "error",
      "@tanstack/query/no-void-query-fn": "error",
      "@tanstack/query/stable-query-client": "error",
      "@tanstack/router/create-route-property-order": "error",
    },
    overrides: [
      {
        // Puck consumes config objects containing renderers, not refresh boundaries.
        files: ["src/components/shared/page-editor/blocks/**/*.tsx"],
        rules: { "react/only-export-components": "off" },
      },
      {
        files: ["src/**/*.{ts,tsx}"],
        rules: {
          "better-tailwindcss/enforce-canonical-classes": "error",
        },
      },
      {
        files: ["src/routes/**/*.tsx"],
        rules: {
          "react/only-export-components": "off",
        },
      },
      {
        files: ["src/components/ui/**"],
        rules: {
          "jsx-a11y/label-has-associated-control": "off",
          // shadcn primitives expose variants/hooks alongside components.
          "react/only-export-components": "off",
          // Upstream primitives use ARIA roles without changing their public tag/ref contracts.
          "jsx-a11y/prefer-tag-over-role": "off",
        },
      },
      {
        files: ["src/**/*.test.ts", "src/**/tests.ts"],
        rules: {
          "typescript/no-floating-promises": "off",
        },
      },
      {
        files: ["src/components/shared/markdown/renderer.tsx"],
        rules: {
          "jsx-a11y/anchor-has-content": "off",
          "jsx-a11y/heading-has-content": "off",
        },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    settings: {
      "better-tailwindcss": {
        cwd: fileURLToPath(new URL(".", import.meta.url)),
        entryPoint: "./src/index.css",
      },
    },
    jsPlugins: [
      {
        name: "better-tailwindcss",
        specifier: "eslint-plugin-better-tailwindcss",
      },
      {
        name: "@tanstack/query",
        specifier: "@tanstack/eslint-plugin-query",
      },
      {
        name: "@tanstack/router",
        specifier: "@tanstack/eslint-plugin-router",
      },
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  fmt: {
    endOfLine: "lf",
    semi: false,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "es5",
    printWidth: 80,
    sortPackageJson: false,
    sortTailwindcss: {
      stylesheet: "src/index.css",
      functions: ["cn", "cva"],
    },
    ignorePatterns: [
      "node_modules/",
      "coverage/",
      ".pnpm-store/",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      "src/routeTree.gen.ts",
      "src/api/schema.d.ts",
      "out/",
    ],
  },
  plugins: lazyPlugins(() => [
    // Must precede the react plugin so generated route files get transformed.
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ]),
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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // Keep the editor's icon catalog separate from its config bundle.
              name: "editor-icons",
              test: /page-editor\/blocks\/_lib\/icons\.tsx$/,
            },
          ],
        },
      },
    },
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
