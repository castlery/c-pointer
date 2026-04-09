import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "C-Pointer",
  version: "0.1.0",
  description: "Page-to-code analyzer for Castlery Web and POS test environments.",
  permissions: [
    "storage",
    "activeTab",
    "scripting"
  ],
  host_permissions: [
    "https://www-test.castlery.com/*",
    "https://pos-test.castlery.com/*",
    "http://localhost:3001/*"
  ],
  action: {
    default_popup: "src/popup/index.html"
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: [
        "https://www-test.castlery.com/*",
        "https://pos-test.castlery.com/*"
      ],
      js: [
        "src/content/index.tsx"
      ],
      run_at: "document_idle"
    }
  ]
});
