import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // three.js alone is about 520 kB minified; warn only when our own code adds real weight.
    chunkSizeWarningLimit: 700,
  },
  test: {
    environment: "node",
  },
});
