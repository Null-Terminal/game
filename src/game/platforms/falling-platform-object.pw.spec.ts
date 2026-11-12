import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/platforms/tests/falling-platform";

test("a falling plank drops between adjacent static planks", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ left, middle, right, player, destroy }) => {
    const initialY = middle.y;
    middle.visit(player);
    middle.move(0, -20);

    const result = {
      leftEdge: left.x + left.width,
      middleLeft: middle.x,
      middleRight: middle.x + middle.width,
      rightEdge: right.x,
      initialY,
      y: middle.y,
      destroyed: middle.destroyed
    };

    destroy();
    return result;
  });

  // Спрайты слегка перекрываются визуально, но их коллизионные области разнесены
  expect(result.middleLeft).toBeLessThan(result.leftEdge);
  expect(result.middleRight).toBeGreaterThan(result.rightEdge);
  expect(result.y).toBe(result.initialY - 20);
  expect(result.destroyed).toBe(false);
});

async function createScene(page: Page): Promise<JSHandle<fixture.FallingPlatformScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createFallingPlatformScene } = await import(url) as typeof fixture;
    return createFallingPlatformScene();
  }, "/src/game/platforms/tests/falling-platform.ts");
}
