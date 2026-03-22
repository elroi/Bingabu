import { defineConfig, devices } from "@playwright/test";

/**
 * Local full-stack E2E: `dist/` + API via `vercel dev` ([vercel.e2e.json](vercel.e2e.json)).
 *
 * **Fast iteration (recommended):** Terminal A: `npm run build && npm run dev:e2e`
 * Terminal B: `npm run test:e2e:reuse` — skips starting Vercel (no multi-minute boot).
 *
 * **One-shot:** `npm run test:e2e` — builds once, then starts `vercel dev` (first run is slow).
 *
 * Requires `npm run prepare:e2e` once for Chromium.
 */
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === "1" || process.env.E2E_SKIP_WEBSERVER === "true";

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
    navigationTimeout: 45_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: "npm run build && npx vercel dev --listen 127.0.0.1:3000 --local-config vercel.e2e.json",
          url: "http://127.0.0.1:3000/api/lobby?health=1",
          timeout: 240_000,
          reuseExistingServer: !process.env.CI,
          env: {
            ...process.env,
            VERCEL_NON_INTERACTIVE: "1",
          },
        },
      }),
});
