import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, expect, test } from "@playwright/test";

test("extension drawer can select a component and complete a follow-up", async () => {
  const extensionPath = path.resolve("/Users/colorli/castlery/c-pointer/packages/browser-extension/dist");
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "c-pointer-extension-"));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:4173/plugin-fixture.html");

    const launcher = page.locator("[data-testid='c-pointer-launcher']");
    await expect(launcher).toBeVisible();
    await launcher.click();

    const selectButton = page.locator("[data-testid='c-pointer-select-button']");
    await expect(selectButton).toBeVisible();
    await selectButton.click();

    await page.locator("[data-testid='fixture-target']").click();

    await expect(page.getByText("Button is the POS entry point for adding service items to cart.")).toBeVisible();

    const followupInput = page.locator("[data-testid='c-pointer-followup-input']");
    await followupInput.fill("Which service handles the mutation?");
    await page.locator("[data-testid='c-pointer-send-question']").click();

    await expect(page.getByText('Follow-up analyzed for: "Which service handles the mutation?"')).toBeVisible();
  } finally {
    await context.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
});
