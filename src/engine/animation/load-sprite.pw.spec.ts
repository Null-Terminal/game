import { expect, test } from "@playwright/test";

const fixtureUrl = "/src/engine/animation/tests/load-sprite.ts";

test("loads and bakes a sprite in a worker", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const workers: string[] = [];
  page.on("worker", (worker) => workers.push(worker.url()));

  const pixels = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.loadSpritePixels();
  }, fixtureUrl);

  expect(pixels).toEqual({ red: [255, 0, 0, 255], background: [0, 0, 0, 0] });
  expect(workers).toHaveLength(1);
});

test("keeps source pixels when no background removal is requested", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const pixels = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.loadSpritePixels(false);
  }, fixtureUrl);

  expect(pixels).toEqual({ red: [255, 0, 0, 255], background: [0, 255, 0, 255] });
});

test("uses the same baking path when workers are unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Worker", { configurable: true, value: undefined });
  });

  await page.goto("/tests/fixture.html");

  const pixels = await page.evaluate(async (url) => {
    const fixture = await import(url);
    return fixture.loadSpritePixels();
  }, fixtureUrl);

  expect(pixels).toEqual({ red: [255, 0, 0, 255], background: [0, 0, 0, 0] });
});
