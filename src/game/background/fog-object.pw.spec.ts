import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/background/fog-object/tests/fixture";

test("fog inspection follows the parallax band, including camera movement", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ fog, canvas, render, destroy }) => {
    fog.game.camera.y = 100;

    const ctx = canvas.canvas.getContext("2d")!;
    const originalStroke = ctx.strokeRect;
    const originalTable = console.table;
    const bounds: number[][] = [];
    let rows: unknown[] = [];

    ctx.strokeRect = function (x, y, width, height) {
      bounds.push([x, y, width, height]);
      return originalStroke.call(this, x, y, width, height);
    };
    console.table = (value) => { rows = value; };

    try {
      render(16);

      const rect = canvas.canvas.getBoundingClientRect();
      canvas.canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height * 0.5
      }));

    } finally {
      ctx.strokeRect = originalStroke;
      console.table = originalTable;
      destroy();
    }

    return { bounds, rows };
  });

  expect(result.bounds).toEqual([[0, 75, 320, 110]]);
  expect(result.rows).toMatchObject([{ type: "FogObject", screenBounds: "0, 75, 320, 185" }]);
});

const fixtureUrl = "/src/game/background/fog-object/tests/fixture.ts";

async function createScene(page: Page): Promise<JSHandle<fixture.FogScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createFogScene } = await import(url) as typeof fixture;
    return createFogScene();
  }, fixtureUrl);
}
