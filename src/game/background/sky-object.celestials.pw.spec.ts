import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/background/sky-object/tests/fixture";

test("moon and cloud groups have their own inspection bounds", async ({ page }) => {
  const scene = await createScene(page, "dusk");

  const result = await scene.evaluate(({ sky, canvas, render, destroy }) => {
    canvas.width = 2048;
    sky.options.debug = { bounds: true, inspect: true };

    const ctx = canvas.canvas.getContext("2d")!;
    const originalStroke = ctx.strokeRect;
    const originalTable = console.table;
    const bounds: { x: number; y: number; width: number; height: number; color: string }[] = [];
    const tables: unknown[][] = [];

    ctx.strokeRect = function (x, y, width, height) {
      bounds.push({ x, y, width, height, color: String(this.strokeStyle) });
      return originalStroke.call(this, x, y, width, height);
    };
    console.table = (rows) => tables.push(rows);

    try {
      render(16);

      const rect = canvas.canvas.getBoundingClientRect();

      for (const color of ["#ffe18c", "#90d7f0"]) {
        const target = bounds.find((entry) => entry.color === color)!;

        canvas.canvas.dispatchEvent(new MouseEvent("click", {
          clientX: rect.left + (target.x + target.width / 2) * rect.width / canvas.width,
          clientY: rect.top + (target.y + target.height / 2) * rect.height / canvas.height,
          ctrlKey: true
        }));
      }

    } finally {
      ctx.strokeRect = originalStroke;
      console.table = originalTable;
      destroy();
    }

    return { bounds, tables };
  });

  expect(result.bounds.some(({ color }) => color === "#ffe18c")).toBe(true);
  expect(result.bounds.some(({ color }) => color === "#90d7f0")).toBe(true);
  expect(result.tables[0]).toContainEqual(expect.objectContaining({ part: "moon" }));
  expect(result.tables[1]).toContainEqual(expect.objectContaining({ part: expect.stringMatching(/^cloud /) }));
});

test("cloud bounds become available when debug is enabled after the sky is built", async ({ page }) => {
  const scene = await createScene(page, "dusk");

  const result = await scene.evaluate(({ sky, canvas, render, destroy }) => {
    try {
      canvas.width = 2048;
      render(16);

      const withoutDebug = sky.render.getCloudBounds().length;

      sky.options.debug = { bounds: true };
      render(32);

      return { withoutDebug, withDebug: sky.render.getCloudBounds().length };

    } finally {
      destroy();
    }
  });

  expect(result.withoutDebug).toBe(0);
  expect(result.withDebug).toBeGreaterThan(0);
});

test("lightning is inspectable only during a visible strike", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ sky, canvas, render, destroy }) => {
    sky.options.debug = { bounds: true, inspect: true };

    const ctx = canvas.canvas.getContext("2d")!;
    const originalStroke = ctx.strokeRect;
    const originalTable = console.table;
    const lightning: { x: number; y: number; width: number; height: number }[] = [];
    let rows: unknown[] = [];

    ctx.strokeRect = function (x, y, width, height) {
      if (this.strokeStyle === "#b8e9ff") {
        lightning.push({ x, y, width, height });
      }

      return originalStroke.call(this, x, y, width, height);
    };
    console.table = (value) => { rows = value; };

    try {
      render(1);
      const beforeStrike = lightning.length;
      render(1301);

      const target = lightning[0];

      if (target != null) {
        const rect = canvas.canvas.getBoundingClientRect();
        canvas.canvas.dispatchEvent(new MouseEvent("click", {
          clientX: rect.left + (target.x + target.width / 2) * rect.width / canvas.width,
          clientY: rect.top + (target.y + target.height / 2) * rect.height / canvas.height,
          ctrlKey: true
        }));
      }

      return { beforeStrike, lightning, rows };

    } finally {
      ctx.strokeRect = originalStroke;
      console.table = originalTable;
      destroy();
    }
  });

  expect(result.beforeStrike).toBe(0);
  expect(result.lightning.length).toBeGreaterThan(0);
  expect(result.rows).toContainEqual(expect.objectContaining({ part: "lightning" }));
});

test("sky debug draws and inspects with the WebGL renderer", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { createWebGLSkyScene } = await import(url) as typeof fixture;
    const { sky, canvas, destroy } = await createWebGLSkyScene();
    const gl = canvas.canvas.getContext("webgl2")!;

    sky.game.camera.y = 80;

    const border = await new Promise<number[]>((resolve) => {
      requestAnimationFrame(() => {
        const pixel = new Uint8Array(4);
        gl.readPixels(1, canvas.height - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        resolve(Array.from(pixel));
      });
    });

    let rows: unknown[] = [];
    const original = console.table;
    console.table = (value) => { rows = value; };

    try {
      const rect = canvas.canvas.getBoundingClientRect();
      canvas.canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        ctrlKey: true
      }));

    } finally {
      console.table = original;
      destroy();
    }

    return { border, rows };
  }, fixtureUrl);

  expect(result.border.slice(0, 3)).toEqual([141, 124, 255]);
  expect(result.rows).toContainEqual(expect.objectContaining({ type: "SkyObject", part: null }));
});

const fixtureUrl = "/src/game/background/sky-object/tests/fixture.ts";

async function createScene(page: Page, preset: "storm" | "dusk" = "storm"): Promise<JSHandle<fixture.SkyScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async ({ url, preset }) => {
    const { createSkyScene } = await import(url) as typeof fixture;
    return createSkyScene(preset);
  }, { url: fixtureUrl, preset });
}
