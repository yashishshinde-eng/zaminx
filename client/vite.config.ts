import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@zeminex/shared": path.resolve(__dirname, "../shared/src/index.ts"),
      "@zeminex/shared/schemas": path.resolve(__dirname, "../shared/src/schemas/index.ts"),
      "@zeminex/shared/types": path.resolve(__dirname, "../shared/src/types/index.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@zeminex/shared"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    // apexcharts (in its own `charts` chunk below) is inherently ~580kB; it's
    // isolated so it only loads on chart pages and caches independently. Raise
    // the limit so this expected, intentional chunk doesn't trip the warning.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split heavy vendor groups into stable, long-term-cacheable chunks so
        // an app-code change doesn't re-download apexcharts/react/etc., and so
        // the big chart lib lives in its own chunk instead of bloating a route
        // chunk (the apexcharts chunk-size warning).
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          charts: ["apexcharts", "react-apexcharts"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});