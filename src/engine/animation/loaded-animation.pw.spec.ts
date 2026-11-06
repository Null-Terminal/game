import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/animation/tests/fixture";

test("sprite frames keep source pixels and cache each effect separately", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ animation, pixel, destroy }) => {
    const original = animation.getSpriteFrame(0);
    const cached = animation.getSpriteFrame(0);
    const flipped = animation.getSpriteFrame(0, { flipX: true });

    const result = {
      cached: original === cached,
      separateEffect: original !== flipped,
      originalLeft: pixel(original, 0, 0),
      originalRight: pixel(original, 3, 0),
      flippedLeft: pixel(flipped, 0, 0)
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    cached: true,
    separateEffect: true,
    originalLeft: [255, 0, 0],
    originalRight: [0, 255, 0],
    flippedLeft: [0, 255, 0]
  });
});

test("a repeat region uses only its selected fragment", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ animation, pixel, destroy }) => {
    const wholeFrame = animation.getPatternFrame(0, 32, 32);
    const fragment = animation.getPatternFrame(0, 32, 32, "width");

    const result = {
      wholeFrameAtGreen: pixel(wholeFrame, 3, 0),
      wholeFrameAtNextCell: pixel(wholeFrame, 4, 0),
      fragmentAtFormerGreen: pixel(fragment, 3, 0),
      fragmentAtFarEdge: pixel(fragment, 31, 31)
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    wholeFrameAtGreen: [0, 255, 0],
    wholeFrameAtNextCell: [255, 0, 0],
    fragmentAtFormerGreen: [255, 0, 0],
    fragmentAtFarEdge: [255, 0, 0]
  });
});

const fixtureUrl = "/src/engine/animation/tests/fixture.ts";

async function createScene(page: Page): Promise<JSHandle<fixture.FrameScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createFrameScene } = await import(url) as typeof fixture;
    return createFrameScene();
  }, fixtureUrl);
}
