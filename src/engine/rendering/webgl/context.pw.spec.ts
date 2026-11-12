import { expect, test } from "@playwright/test";

import type * as webgl from "#engine/rendering/webgl/context";

const moduleUrl = "/src/engine/rendering/webgl/context.ts";

test("drawImage, alpha and rectangular clipping use the expected pixels", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { WebGLCanvasContext } = await import(url) as typeof webgl;
    const source = new OffscreenCanvas(2, 1);
    const sourceContext = source.getContext("2d")!;

    sourceContext.fillStyle = "#ff0000";
    sourceContext.fillRect(0, 0, 1, 1);
    sourceContext.fillStyle = "#0000ff";
    sourceContext.fillRect(1, 0, 1, 1);

    const image = source.transferToImageBitmap();
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 4;

    const ctx = new WebGLCanvasContext(canvas);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 8, 4);

    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 0, 2, 4);
    ctx.clip();
    ctx.drawImage(image, 1, 0, 4, 4);
    ctx.restore();

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#000000";
    ctx.fillRect(6, 0, 2, 4);

    const gl = canvas.getContext("webgl2")!;
    const pixels = new Uint8Array(8 * 4 * 4);
    gl.readPixels(0, 0, 8, 4, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const colorAt = (x: number) => Array.from(pixels.slice((3 * 8 + x) * 4, (3 * 8 + x + 1) * 4));
    const colors = [colorAt(0), colorAt(2), colorAt(3), colorAt(4), colorAt(6)];

    ctx.destroy();
    image.close();

    return colors;
  }, moduleUrl);

  expect(result).toEqual([
    [255, 255, 255, 255],
    [255, 0, 0, 255],
    [0, 0, 255, 255],
    [255, 255, 255, 255],
    [128, 128, 128, 255]
  ]);
});

test("recovers after WebGL context loss", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { WebGLCanvasContext } = await import(url) as typeof webgl;
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    document.body.append(canvas);

    const ctx = new WebGLCanvasContext(canvas);
    const gl = canvas.getContext("webgl2")!;
    const extension = gl.getExtension("WEBGL_lose_context");

    if (extension == null) {
      ctx.destroy();
      return "unsupported";
    }

    const lost = new Promise<void>((resolve) => canvas.addEventListener("webglcontextlost", () => resolve(), { once: true }));
    extension.loseContext();

    await Promise.race([lost, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("context loss event missing")), 3000))]);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const restored = new Promise<void>((resolve) => canvas.addEventListener("webglcontextrestored", () => resolve(), { once: true }));
    extension.restoreContext();
    await Promise.race([restored, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("context restore event missing")), 3000))]);

    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 2, 2);

    const pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    ctx.destroy();

    return Array.from(pixel);
  }, moduleUrl);

  expect(result === "unsupported" || JSON.stringify(result) === JSON.stringify([255, 0, 0, 255])).toBe(true);
});

test("source rectangles and transforms place pixels correctly", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { WebGLCanvasContext } = await import(url) as typeof webgl;
    const source = new OffscreenCanvas(2, 1);
    const sourceContext = source.getContext("2d")!;

    sourceContext.fillStyle = "red";
    sourceContext.fillRect(0, 0, 1, 1);
    sourceContext.fillStyle = "blue";
    sourceContext.fillRect(1, 0, 1, 1);

    const image = source.transferToImageBitmap();
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;

    const ctx = new WebGLCanvasContext(canvas);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 4, 4);

    ctx.drawImage(image, 1, 0, 1, 1, 0, 0, 1, 1);
    ctx.setTransform(0, 1, -1, 0, 4, 0);
    ctx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);

    const gl = canvas.getContext("webgl2")!;
    const pixels = new Uint8Array(4 * 4 * 4);
    gl.readPixels(0, 0, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const colorAt = (x: number, y: number) => {
      const index = ((3 - y) * 4 + x) * 4;
      return Array.from(pixels.slice(index, index + 4));
    };

    const colors = [colorAt(0, 0), colorAt(3, 0), colorAt(2, 0)];
    ctx.destroy();
    image.close();

    return colors;
  }, moduleUrl);

  expect(result).toEqual([
    [0, 0, 255, 255],
    [255, 0, 0, 255],
    [255, 255, 255, 255]
  ]);
});

test("reuses rasterized text and releases old text textures", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { WebGLCanvasContext } = await import(url) as typeof webgl;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 24;

    const ctx = new WebGLCanvasContext(canvas);
    ctx.fillStyle = "white";
    ctx.font = "12px sans-serif";

    ctx.fillText("A", 2, 20);
    const first = ctx.textureStats;

    ctx.fillText("A", 2, 20);
    const repeated = ctx.textureStats;

    for (let index = 0; index < 128; index++) {
      ctx.fillText(String(index), 2, 20);
    }

    const afterEviction = ctx.textureStats;
    ctx.clearTextures();
    const afterClear = ctx.textureStats;

    ctx.fillText("127", 2, 20);
    const afterReload = ctx.textureStats;
    ctx.destroy();

    return { first, repeated, afterEviction, afterClear, afterReload };
  }, moduleUrl);

  expect(result.first.entries).toBe(1);
  expect(result.repeated.uploads).toBe(result.first.uploads);
  expect(result.afterEviction.entries).toBe(128);
  expect(result.afterEviction.uploads).toBe(129);
  expect(result.afterClear.entries).toBe(0);
  expect(result.afterReload.uploads).toBe(130);
});

test("demo uses the WebGL2 renderer by default", async ({ page }) => {
  await page.goto("/game.html");
  await expect(page.locator("#loading")).toBeHidden();

  const active = await page.locator("#game").evaluate((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext("webgl2");
    return gl != null && !gl.isContextLost();
  });

  expect(active).toBe(true);
});
