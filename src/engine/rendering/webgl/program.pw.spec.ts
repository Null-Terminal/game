import { expect, test } from "@playwright/test";

import type * as program from "#engine/rendering/webgl/program";

test("a failed fragment compilation releases the compiled vertex shader", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { createWebGLProgram } = await import(url) as typeof program;
    const gl = document.createElement("canvas").getContext("webgl2")!;
    const createShader = gl.createShader.bind(gl);
    const shaderSource = gl.shaderSource.bind(gl);
    const shaders = new Map<number, WebGLShader>();

    gl.createShader = (type) => {
      const shader = createShader(type)!;
      shaders.set(type, shader);
      return shader;
    };

    gl.shaderSource = (shader, source) => {
      shaderSource(shader, shader === shaders.get(gl.FRAGMENT_SHADER) ? "invalid fragment shader" : source);
    };

    let failed = false;

    try {
      createWebGLProgram(gl);

    } catch {
      failed = true;
    }

    return {
      failed,
      created: shaders.size,
      alive: [...shaders.values()].filter((shader) => gl.isShader(shader)).length
    };
  }, "/src/engine/rendering/webgl/program.ts");

  expect(result).toEqual({ failed: true, created: 2, alive: 0 });
});
