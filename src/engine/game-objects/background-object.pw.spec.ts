import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game-objects/background-object/tests/fixture";

test("a finite bbox clips the repeated background at both horizontal edges", async ({ page }) => {
  const scene = await createScene(page, { bbox: [20, 20, 40, 30], stretch: "w" });

  const colors = await scene.evaluate(({ render, pixel, destroy }) => {
    render();

    const colors = {
      before: pixel(19, 75),
      left: pixel(20, 75),
      right: pixel(39, 75),
      after: pixel(40, 75)
    };

    destroy();
    return colors;
  });

  expect(colors).toEqual({
    before: [0, 0, 0],
    left: [255, 0, 0],
    right: [255, 0, 0],
    after: [0, 0, 0]
  });
});

test("parallax moves the horizontal axis while the static vertical axis stays put", async ({ page }) => {
  const scene = await createScene(page, {
    bbox: [20, 20, 40, 30],
    scrollFactor: [0.5, 1],
    static: "h",
    stretch: "w"
  });

  const colors = await scene.evaluate(({ game, render, pixel, destroy }) => {
    game.camera.x = 10;
    game.camera.y = 30;
    render();

    const colors = {
      beforeShiftedLeft: pixel(14, 75),
      shiftedLeft: pixel(15, 75),
      shiftedRight: pixel(34, 75),
      afterShiftedRight: pixel(35, 75),
      unchangedHeight: pixel(20, 70)
    };

    destroy();
    return colors;
  });

  expect(colors).toEqual({
    beforeShiftedLeft: [0, 0, 0],
    shiftedLeft: [255, 0, 0],
    shiftedRight: [255, 0, 0],
    afterShiftedRight: [0, 0, 0],
    unchangedHeight: [255, 0, 0]
  });
});

const fixtureUrl = "/src/engine/game-objects/background-object/tests/fixture.ts";

async function createScene(
  page: Page,
  options: fixture.BackgroundSceneOptions
): Promise<JSHandle<fixture.BackgroundScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async ({ url, options }) => {
    const { createBackgroundScene } = await import(url) as typeof fixture;
    return createBackgroundScene(options);
  }, { url: fixtureUrl, options });
}
