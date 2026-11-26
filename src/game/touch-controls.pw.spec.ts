import { expect, test } from "@playwright/test";

import type * as interactionFixture from "#game/tests/fixture";

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

test("touch buttons press and release shared actions", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const fixtureUrl = "/src/game/tests/fixture.ts";
  const touchControlsUrl = "/src/game/touch-controls.ts";
  const scene = await page.evaluateHandle(async ({ fixtureUrl, touchControlsUrl }) => {
    const { createInteractionScene } = await import(fixtureUrl) as typeof interactionFixture;
    const { GameTouchControls } = await import(touchControlsUrl);
    const scene = await createInteractionScene();
    const controls = new GameTouchControls();
    document.body.append(controls);
    controls.mount(scene.game, scene.game.input);
    return { ...scene, controls };
  }, { fixtureUrl, touchControlsUrl });

  const left = page.locator("game-touch-controls").getByRole("button", { name: "Влево" });
  await expect(left).toBeVisible();

  const box = await left.boundingBox();

  if (box == null) {
    throw new Error("Touch button has no bounds");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  const pressed = await scene.evaluate(({ player }) => player.actions.has("left"));
  expect(pressed).toBe(true);

  await page.mouse.up();
  const released = await scene.evaluate(({ player }) => player.actions.has("left"));
  expect(released).toBe(false);

  await page.locator("game-touch-controls").getByRole("button", { name: "Пауза" }).tap();
  const paused = await scene.evaluate(({ game }) => game.status.paused);
  expect(paused).toBe(true);

  await scene.evaluate(({ controls, destroy }) => {
    controls.remove();
    destroy();
  });
});
