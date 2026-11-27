import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/background/wind-debris-object/tests/fixture";

test("wind particles have distinct bounds and can be inspected individually", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ canvas, render, destroy }) => {
    const ctx = canvas.canvas.getContext("2d")!;
    const originalStroke = ctx.strokeRect;
    const originalTable = console.table;
    const bounds: { x: number; y: number; width: number; height: number; color: string }[] = [];
    let rows: unknown[] = [];

    ctx.strokeRect = function (x, y, width, height) {
      bounds.push({ x, y, width, height, color: String(this.strokeStyle) });
      return originalStroke.call(this, x, y, width, height);
    };
    console.table = (value) => { rows = value; };

    try {
      render(1);

      const particle = bounds[0];

      if (particle != null) {
        const rect = canvas.canvas.getBoundingClientRect();
        canvas.canvas.dispatchEvent(new MouseEvent("click", {
          clientX: rect.left + (particle.x + particle.width / 2) * rect.width / canvas.width,
          clientY: rect.top + (particle.y + particle.height / 2) * rect.height / canvas.height
        }));
      }

    } finally {
      ctx.strokeRect = originalStroke;
      console.table = originalTable;
      destroy();
    }

    return { bounds, rows };
  });

  expect(result.bounds.length).toBeGreaterThan(0);
  expect(result.bounds.every(({ color }) => color === "#ffd54a")).toBe(true);
  expect(result.rows).toMatchObject([{ type: "WindDebrisObject" }]);
  expect(["TumbleweedParticle", "NewspaperParticle"]).toContain(
    (result.rows[0] as { part: string }).part
  );
});

test("dynamic effects setting stops and restores wind particles", async ({ page }) => {
  const scene = await createScene(page);

  const counts = await scene.evaluate(({ debris, canvas, render, destroy }) => {
    const ctx = canvas.canvas.getContext("2d")!;
    const originalStroke = ctx.strokeRect;
    let drawn = 0;

    ctx.strokeRect = function (x, y, width, height) {
      drawn++;
      return originalStroke.call(this, x, y, width, height);
    };

    try {
      render(16);
      const enabled = drawn;

      drawn = 0;
      debris.game.settings.set("dynamicEffects", false);
      render(32);
      const disabled = drawn;

      drawn = 0;
      debris.game.settings.set("dynamicEffects", true);
      render(48);
      return { enabled, disabled, restored: drawn };

    } finally {
      ctx.strokeRect = originalStroke;
      destroy();
    }
  });

  expect(counts.enabled).toBeGreaterThan(0);
  expect(counts.disabled).toBe(0);
  expect(counts.restored).toBeGreaterThan(0);
});

const fixtureUrl = "/src/game/background/wind-debris-object/tests/fixture.ts";

async function createScene(page: Page): Promise<JSHandle<fixture.WindDebrisScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createWindDebrisScene } = await import(url) as typeof fixture;
    return createWindDebrisScene();
  }, fixtureUrl);
}
