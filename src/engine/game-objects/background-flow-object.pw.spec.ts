import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game-objects/background-flow-object/tests/fixture";

test("composition animates its sprites independently", async ({ page }) => {
  const scene = await createScene(page);

  const first = await scene.evaluate((value) => {
    value.renderAt(1);
    return [value.colorAt(5, 85), value.colorAt(15, 85)];
  });

  expect(first).toEqual([[255, 0, 0], [0, 0, 255]]);

  const changed = await scene.evaluate((value) => {
    value.renderAt(52);
    value.renderAt(53);
    return [value.colorAt(5, 85), value.colorAt(15, 85)];
  });

  expect(changed).toEqual([[0, 255, 0], [0, 0, 255]]);

  await scene.evaluate((value) => value.destroy());
});

test("playing one sprite replaces the composition without changing its options", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate((value) => {
    const original = value.flow.options.sprites;
    value.flow.play(value.second);
    value.renderAt(1);

    return {
      color: value.colorAt(5, 85),
      optionsUnchanged: value.flow.options.sprites === original
    };
  });

  expect(result).toEqual({ color: [0, 0, 255], optionsUnchanged: true });
  await scene.evaluate((value) => value.destroy());
});

const fixtureUrl = "/src/engine/game-objects/background-flow-object/tests/fixture.ts";

async function createScene(page: Page): Promise<JSHandle<fixture.FlowScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createFlowScene } = await import(url) as typeof fixture;
    return createFlowScene();
  }, fixtureUrl);
}
