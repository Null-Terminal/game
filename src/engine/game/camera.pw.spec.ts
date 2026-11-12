import { expect, test } from "@playwright/test";

import type * as fixture from "#engine/game/tests/camera-fixture";

test("the dead zone keeps the same proportions when the canvas is resized", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const scene = await page.evaluateHandle(async (url) => {
    const module = await import(url) as typeof fixture;
    return module.createCameraScene();
  }, "/src/engine/game/tests/camera-fixture.ts");

  const positions = await scene.evaluate(({ camera, canvas, destroy }) => {
    camera.update();
    const small = { x: camera.x, y: camera.y };

    camera.x = 0;
    camera.y = 0;
    canvas.width = 400;
    canvas.height = 200;

    camera.update();
    const large = { x: camera.x, y: camera.y };

    destroy();
    return { small, large };
  });

  expect(positions.small).toEqual({ x: 30, y: 10 });
  expect(positions.large).toEqual({ x: 0, y: 0 });
});
