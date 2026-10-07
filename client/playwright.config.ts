import { defineConfig } from "@playwright/test";

// Browser smoke test against the production build. Uses the installed Chrome (GitHub's Ubuntu
// runners ship it), so no browser download is needed.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    channel: "chrome",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
