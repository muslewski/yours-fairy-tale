import { defineConfig, devices } from "@playwright/test";

// Load test env (Neon test branch, port 3100, etc.) without a new dep.
try {
  process.loadEnvFile(".env.test");
} catch {
  /* CI provides env directly */
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // shared test DB — serialize, like vitest
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /fixtures\/auth\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/customer.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
  },
});
