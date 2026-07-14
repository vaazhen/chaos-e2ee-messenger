import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "electron" ? "./" : "/",
  define: {
    global: "globalThis",
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    // Crypto initialization uses top-level await so secure state is loaded before the app starts.
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    exclude: [
      "e2e/**",
      "e2e-real/**",
      "playwright-report/**",
      "playwright-report-real/**",
      "test-results/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: [
        "e2e/**",
        "e2e-real/**",
        "playwright-report/**",
        "playwright-report-real/**",
        "test-results/**",
        "src/main.jsx",
        "src/styles.js",
        "src/types/**",
        "src/test/**",
      ],
      thresholds: {
        // Current repository-wide floor. Security-critical modules are covered
        // by dedicated protocol and session tests; raise these numbers as the UI
        // integration suite expands.
        statements: 54,
        lines: 54,
        branches: 65,
        functions: 54,
      },
    },
  },
}));
