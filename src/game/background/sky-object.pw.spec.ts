import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/background/sky-object/tests/fixture";

test("switching sky presets replaces baked textures", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ sky, render, pixel, destroy }) => {
    render(16);
    const storm = pixel(0, 0);

    sky.play(sky.animations.overcast);
    render(32);
    const overcast = pixel(0, 0);

    sky.play(sky.animations.storm);
    render(48);
    const stormAgain = pixel(0, 0);

    destroy();
    return { storm, overcast, stormAgain };
  });

  expect(result.overcast).not.toEqual(result.storm);
  expect(result.stormAgain).toEqual(result.storm);
});

test("the sky rebuilds at the new canvas size", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ sky, canvas, render, destroy }) => {
    render(16);
    const initial = [sky.width, sky.height];

    canvas.width = 400;
    canvas.height = 300;
    render(32);
    const resized = [sky.width, sky.height];

    destroy();
    return { initial, resized };
  });

  expect(result).toEqual({ initial: [320, 240], resized: [400, 300] });
});

const fixtureUrl = "/src/game/background/sky-object/tests/fixture.ts";

async function createScene(page: Page, preset: "storm" | "dusk" = "storm"): Promise<JSHandle<fixture.SkyScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async ({ url, preset }) => {
    const { createSkyScene } = await import(url) as typeof fixture;
    return createSkyScene(preset);
  }, { url: fixtureUrl, preset });
}
