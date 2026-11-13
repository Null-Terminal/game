import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/background/sky-object/tests/fixture";

test("inspection covers the visible sky", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ sky, canvas, render, destroy }) => {
    sky.options.debug = { inspect: true };
    render(16);

    let rows: unknown[] = [];
    const original = console.table;
    console.table = (value) => { rows = value; };

    try {
      const rect = canvas.canvas.getBoundingClientRect();
      canvas.canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      }));

    } finally {
      console.table = original;
    }

    destroy();
    return rows;
  });

  expect(result).toMatchObject([{ type: "SkyObject", layer: "background" }]);
});

test("sky bounds have a distinct default color", async ({ page }) => {
  const scene = await createScene(page);

  const colors = await scene.evaluate(({ sky, canvas, render, destroy }) => {
    const ctx = canvas.canvas.getContext("2d")!;
    const original = ctx.strokeRect;
    const colors: string[] = [];

    ctx.strokeRect = function (...args) {
      colors.push(String(this.strokeStyle));
      return original.apply(this, args);
    };

    try {
      sky.options.debug = { bounds: true };
      render(16);

    } finally {
      ctx.strokeRect = original;
      destroy();
    }

    return colors;
  });

  expect(colors[0]).toBe("#8d7cff");
  expect(colors.slice(1).every((color) => color === "#90d7f0")).toBe(true);
});

test("sky bounds stay on the canvas when the camera moves", async ({ page }) => {
  const scene = await createScene(page);

  const bounds = await scene.evaluate(({ sky, canvas, render, destroy }) => {
    const ctx = canvas.canvas.getContext("2d")!;
    const original = ctx.strokeRect;
    const bounds: number[][] = [];

    ctx.strokeRect = function (x, y, width, height) {
      if (this.strokeStyle === "#8d7cff") {
        bounds.push([x, y, width, height]);
      }

      return original.call(this, x, y, width, height);
    };

    try {
      sky.game.camera.x = 120;
      sky.game.camera.y = 80;
      sky.options.debug = { bounds: true };
      render(16);

    } finally {
      ctx.strokeRect = original;
      destroy();
    }

    return bounds;
  });

  expect(bounds).toEqual([[0, 0, 320, 240]]);
});

const fixtureUrl = "/src/game/background/sky-object/tests/fixture.ts";

async function createScene(page: Page, preset: "storm" | "dusk" = "storm"): Promise<JSHandle<fixture.SkyScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async ({ url, preset }) => {
    const { createSkyScene } = await import(url) as typeof fixture;
    return createSkyScene(preset);
  }, { url: fixtureUrl, preset });
}
