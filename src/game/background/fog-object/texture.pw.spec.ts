import { expect, test } from "@playwright/test";

import type * as textureModule from "#game/background/fog-object/texture";

const textureUrl = "/src/game/background/fog-object/texture.ts";

test("the same seed bakes the same fog pixels", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { FogTexture } = await import(url) as typeof textureModule;
    const texture = new FogTexture({ density: 5, seed: 17 });

    const first = texture.build(128, 80);
    const second = texture.build(128, 80);

    const canvas = new OffscreenCanvas(first.image.width, first.image.height);
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(first.image, 0, 0);
    const firstPixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(second.image, 0, 0);
    const secondPixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const equal = firstPixels.every((value, index) => value === secondPixels[index]);
    const result = {
      equal,
      size: [first.image.width, first.image.height],
      sourceHeight: first.sourceHeight
    };

    first.image.close();
    second.image.close();

    return result;
  }, textureUrl);

  expect(result.equal).toBe(true);
  expect(result.size[0]).toBe(128);
  expect(result.size[1]).toBeGreaterThan(80);
  expect(result.sourceHeight).toBe(80);
});

test("fade lowers opacity near the bottom of the fog band", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { FogTexture } = await import(url) as typeof textureModule;

    const plain = new FogTexture({ density: 0, seed: 1 }).build(32, 100);
    const faded = new FogTexture({ density: 0, seed: 1, fade: [0.2, 0.8] }).build(32, 100);

    const canvas = new OffscreenCanvas(32, plain.image.height);
    const ctx = canvas.getContext("2d")!;
    const sampleY = 50 - plain.top;

    ctx.drawImage(plain.image, 0, 0);
    const plainAlpha = ctx.getImageData(16, sampleY, 1, 1).data[3]!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(faded.image, 0, 0);
    const fadedAlpha = ctx.getImageData(16, sampleY, 1, 1).data[3]!;

    plain.image.close();
    faded.image.close();

    return { plainAlpha, fadedAlpha };
  }, textureUrl);

  expect(result.plainAlpha).toBeGreaterThan(0);
  expect(result.fadedAlpha).toBeGreaterThan(0);
  expect(result.fadedAlpha).toBeLessThan(result.plainAlpha);
});
