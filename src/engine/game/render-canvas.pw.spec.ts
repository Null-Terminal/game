import { expect, test } from "@playwright/test";

const moduleUrl = "/src/engine/game/render-canvas.ts";

test("uses WebGL by default and allows Canvas2D explicitly", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { RenderCanvas } = await import(url);

    const webglElement = document.createElement("canvas");
    const webgl = new RenderCanvas(webglElement, { width: 16, height: 16 });
    webgl.stop();

    const defaultBackend = webgl.options.backend;
    const hasWebGL = webglElement.getContext("webgl2") != null;
    const hasTextureStats = webgl.textureStats != null;
    webgl.destroy();

    const canvas2dElement = document.createElement("canvas");
    const canvas2d = new RenderCanvas(canvas2dElement, { width: 16, height: 16, backend: "2d" });
    canvas2d.stop();

    const hasCanvas2D = canvas2dElement.getContext("2d") != null;
    const hasNoTextureStats = canvas2d.textureStats == null;
    canvas2d.destroy();

    return { defaultBackend, hasWebGL, hasTextureStats, hasCanvas2D, hasNoTextureStats };
  }, moduleUrl);

  expect(result).toEqual({
    defaultBackend: "webgl",
    hasWebGL: true,
    hasTextureStats: true,
    hasCanvas2D: true,
    hasNoTextureStats: true
  });
});

test("falls back to Canvas2D when WebGL2 is unavailable", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { RenderCanvas } = await import(url);
    const canvas = document.createElement("canvas");
    const getContext = canvas.getContext.bind(canvas);

    Object.defineProperty(canvas, "getContext", {
      value(type: string) {
        return type === "webgl2" ? null : getContext("2d");
      }
    });

    const renderer = new RenderCanvas(canvas, { width: 16, height: 16 });
    renderer.stop();

    const fallbackActive = canvas.getContext("2d") != null;
    const hasNoTextureStats = renderer.textureStats == null;
    renderer.destroy();

    return { fallbackActive, hasNoTextureStats };
  }, moduleUrl);

  expect(result).toEqual({ fallbackActive: true, hasNoTextureStats: true });
});
