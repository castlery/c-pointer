import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    headless: true
  },
  webServer: [
    {
      command: "node ./tests/mock-backend.mjs",
      port: 3012,
      reuseExistingServer: true
    },
    {
      command: "python3 -m http.server 4173 -d ./tests/fixtures",
      port: 4173,
      reuseExistingServer: true
    }
  ]
});
