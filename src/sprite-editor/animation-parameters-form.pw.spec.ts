import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#sprite-editor/tests/fixture";

test("reads basic and advanced animation parameters", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ input, parameters }) => {
    input("speed").value = "1.5";
    input("durationMin").value = "80";
    input("durationMax").value = "120";

    input("collisionBoundsX").value = "2";
    input("collisionBoundsY").value = "3";
    input("collisionBoundsWidth").value = "20";
    input("collisionBoundsHeight").value = "24";

    return parameters.read();
  });

  expect(result).toMatchObject({
    speed: 1.5,
    frameDurationRange: [80, 120],
    collisionBounds: { x: 2, y: 3, width: 20, height: 24 }
  });
});

test("rejects incomplete duration and repeat ranges", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ form, parameters, input }) => {
    input("durationMin").value = "80";

    const incompleteDuration = parameters.read();
    const durationError = input("durationMax").validationMessage;

    input("durationMax").value = "120";
    input("repeatWidthX").value = "2";

    const incompleteRepeat = parameters.read();
    const repeatError = input("repeatWidthY").validationMessage;

    return {
      incompleteDuration,
      durationError,
      incompleteRepeat,
      repeatError,
      advancedOpen: form.querySelector("details")!.open
    };
  });

  expect(result.incompleteDuration).toBeNull();
  expect(result.durationError).toContain("обе границы");

  expect(result.incompleteRepeat).toBeNull();
  expect(result.repeatError).toContain("все четыре координаты");
  expect(result.advancedOpen).toBe(true);
});

test("writing new settings clears old optional values", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ form, parameters, defaults }) => {
    parameters.write({
      ...defaults,
      maxWidth: 64,
      frameDurationRange: [80, 120],
      repeat: { width: { x: 2, y: 0, width: 12, height: 10 } }
    });

    const advancedOpen = form.querySelector("details")!.open;
    const advanced = parameters.read();

    parameters.write(defaults);

    return {
      advancedOpen,
      advanced,
      restored: parameters.read(),
      defaults,
      detailsClosed: !form.querySelector("details")!.open
    };
  });

  expect(result.advancedOpen).toBe(true);
  expect(result.advanced).toMatchObject({
    maxWidth: 64,
    frameDurationRange: [80, 120],
    repeat: { width: { x: 2, y: 0, width: 12, height: 10 } }
  });

  expect(result.restored).toEqual(result.defaults);
  expect(result.detailsClosed).toBe(true);
});

const fixtureUrl = "/src/sprite-editor/tests/fixture.ts";

async function createScene(page: Page): Promise<JSHandle<fixture.EditorScene>> {
  await page.goto("/sprite-editor.html");

  return page.evaluateHandle(async (url) => {
    const { getEditorScene } = await import(url) as typeof fixture;
    return getEditorScene();
  }, fixtureUrl);
}
