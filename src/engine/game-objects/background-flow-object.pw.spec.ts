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

test("inspection selects a flow sprite instead of the whole background", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ flow, renderAt, destroy }) => {
    flow.options.debug = { inspect: true };
    renderAt(1);

    let rows: unknown[] = [];
    const original = console.table;
    console.table = (value) => { rows = value; };

    try {
      const rect = flow.canvas.canvas.getBoundingClientRect();
      flow.canvas.canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width * 0.05,
        clientY: rect.top + rect.height * 0.85
      }));

    } finally {
      console.table = original;
    }

    destroy();
    return rows;
  });

  expect(result).toMatchObject([{ type: "BackgroundFlowObject", part: "sprite 0", frame: 1 }]);
});

test("flow bounds use their own color unless one is specified", async ({ page }) => {
  const scene = await createScene(page);

  const colors = await scene.evaluate(({ flow, renderAt, destroy }) => {
    const ctx = flow.canvas.canvas.getContext("2d")!;
    const original = ctx.strokeRect;
    const colors: string[] = [];

    ctx.strokeRect = function (...args) {
      colors.push(String(this.strokeStyle));
      return original.apply(this, args);
    };

    try {
      flow.options.debug = { bounds: true };
      renderAt(1);
      const defaultColors = colors.splice(0);

      flow.options.debug = { bounds: "#123456" };
      renderAt(2);

      return { defaultColors, customColors: colors };

    } finally {
      ctx.strokeRect = original;
      destroy();
    }
  });

  expect(colors.defaultColors.length).toBeGreaterThan(0);
  expect(colors.defaultColors.every((color) => color === "#ff4d8d")).toBe(true);
  expect(colors.customColors.length).toBeGreaterThan(0);
  expect(colors.customColors.every((color) => color === "#123456")).toBe(true);
});

test("flow labels remain visible above clipped sprites", async ({ page }) => {
  const scene = await createScene(page);

  const color = await scene.evaluate(({ flow, renderAt, colorAt, destroy }) => {
    flow.options.debug = { label: true };
    renderAt(1);

    const color = colorAt(1, 65);
    destroy();
    return color;
  });

  expect(color).toEqual([0, 0, 0]);
});

const fixtureUrl = "/src/engine/game-objects/background-flow-object/tests/fixture.ts";

async function createScene(page: Page): Promise<JSHandle<fixture.FlowScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createFlowScene } = await import(url) as typeof fixture;
    return createFlowScene();
  }, fixtureUrl);
}
