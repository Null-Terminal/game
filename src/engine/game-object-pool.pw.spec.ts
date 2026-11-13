import { expect, test } from "@playwright/test";

import type * as fixture from "#engine/game-objects/game-object/tests/fixture";

test("delete keeps an object revived during its destructor in the pool", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async (url) => {
    const { createLifecycleScene } = await import(url) as typeof fixture;

    const { pool, createRevivingProbe, destroy } = await createLifecycleScene();
    const { pointer, object } = createRevivingProbe();

    pool.delete(...pointer);

    const result = {
      reused: pool.get(...pointer) === object,
      alive: !object.destroyed,
      activeCount: pool.objects[pointer[0]]!.length
    };

    destroy();
    return result;
  }, "/src/engine/game-objects/game-object/tests/fixture.ts");

  expect(result).toEqual({ reused: true, alive: true, activeCount: 1 });
});
