import { expect, test } from "@playwright/test";

import type * as raster from "#engine/rendering/webgl/raster-cache";

const moduleUrl = "/src/engine/rendering/webgl/raster-cache.ts";

test("destroy releases each cached text texture once", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { CanvasRasterCache } = await import(url) as typeof raster;
    const released: ImageBitmap[] = [];
    const cache = new CanvasRasterCache((image) => released.push(image));

    const first = cache.textImage("first", "12px sans-serif", "white").image;
    const second = cache.textImage("second", "12px sans-serif", "white").image;

    cache.destroy();
    cache.destroy();

    return {
      released: released.length,
      firstReleased: released[0] === first,
      secondReleased: released[1] === second,
      firstClosed: first.width === 0,
      secondClosed: second.width === 0
    };
  }, moduleUrl);

  expect(result).toEqual({
    released: 2,
    firstReleased: true,
    secondReleased: true,
    firstClosed: true,
    secondClosed: true
  });
});
