import { expect, test } from "@playwright/test";

test("full flow: left menu navigation -> create lobby -> lobby screen -> start session", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");

  // Check Main Menu rendered with title and left side navigation options
  await expect(page.locator(".main-menu-screen")).toBeVisible();
  await expect(page.locator(".ui-title")).toHaveText("Island Colony");
  await expect(page.locator("#nav-create-btn")).toBeVisible();
  await expect(page.locator("#nav-join-btn")).toBeVisible();
  await expect(page.locator("#nav-settings-btn")).toBeVisible();

  // Test Settings Modal opens and closes properly
  await page.click("#nav-settings-btn");
  await expect(page.locator(".settings-modal-backdrop")).toBeVisible();
  await expect(page.locator(".modal-title")).toHaveText("Settings");
  await page.click("#settings-close-btn");
  await expect(page.locator(".settings-modal-backdrop")).not.toBeVisible();

  // Click Create Lobby on the left menu to open the drawer
  await page.click("#nav-create-btn");
  await expect(page.locator(".menu-form-panel.is-visible")).toBeVisible();

  // Fill in display name and submit
  await page.fill("#player-name", "Pioneer");
  await page.click("#submit-btn");

  // Verify transition to Lobby Screen
  await expect(page.locator(".lobby-screen")).toBeVisible();
  await expect(page.locator(".lobby-status-pill")).toHaveText("Waiting");

  // Verify slot 1 has Pioneer as host
  const hostSlot = page.locator(".slot-card.is-occupied").first();
  await expect(hostSlot).toContainText("Pioneer");
  await expect(hostSlot.locator(".badge-host")).toBeVisible();
  await expect(hostSlot.locator(".badge-you")).toBeVisible();

  // Click Start Session
  await page.click("#start-btn");

  // Verify UI screen transitions to game (overlay unmounted)
  await expect(page.locator(".ui-screen")).not.toBeVisible();

  // Verify no console / page errors
  expect(errors).toEqual([]);
});
