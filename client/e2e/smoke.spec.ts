import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";

// Distinct colors in a grid of samples across the screenshot. A blank or failed canvas is one color;
// the island scene has sky, sea, sand, grass, trees and shading.
function distinctColors(screenshot: Buffer): number {
  const png = PNG.sync.read(screenshot);
  const colors = new Set<string>();
  for (let y = 0; y < png.height; y += 20) {
    for (let x = 0; x < png.width; x += 20) {
      const i = (y * png.width + x) * 4;
      colors.add(`${png.data[i]! >> 3},${png.data[i + 1]! >> 3},${png.data[i + 2]! >> 3}`);
    }
  }
  return colors.size;
}

test("the game loads and renders the island without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");

  const canvas = page.locator("#game");
  await expect(canvas).toHaveJSProperty("width", 1280);
  await expect
    .poll(async () => distinctColors(await page.screenshot()), { timeout: 30_000 })
    .toBeGreaterThan(20);
  expect(errors).toEqual([]);
});
