import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game-objects/game-object/tests/fixture";

test("a path visits its points in order and starts again", async ({ page }) => {
  const scene = await createScene(page);

  const positions = await scene.evaluate(({ createProbe, tick, destroy }) => {
    const { object } = createProbe();
    object.movement.follow({ path: [[100, 0], [100, 100]], speed: 100 });

    const positions: [number, number][] = [];

    for (const now of [500, 1000, 1500, 2000, 2500]) {
      tick(0.5, now);
      positions.push([object.x, object.y]);
    }

    destroy();
    return positions;
  });

  expect(positions).toEqual([
    [50, 0],
    [100, 0],
    [100, 0],
    [100, 50],
    [100, 100]
  ]);
});

test("following a new route replaces the previous one", async ({ page }) => {
  const scene = await createScene(page);

  const positions = await scene.evaluate(({ createProbe, tick, destroy }) => {
    const { object } = createProbe();
    object.movement.follow({ path: [[100, 0]], speed: 100 });

    tick(0.2, 200);
    const firstRoute = object.x;

    object.movement.follow({ at: (time) => [200 + time * 10, 0] });
    tick(0.5, 700);
    const newRoute = object.x;

    destroy();
    return { firstRoute, newRoute };
  });

  expect(positions).toEqual({ firstRoute: 20, newRoute: 205 });
});

test("a custom route does not advance while its object is paused", async ({ page }) => {
  const scene = await createScene(page);

  const positions = await scene.evaluate(({ createProbe, tick, destroy }) => {
    const { object } = createProbe();
    object.movement.follow({ at: (time) => [time * 20, 0] });

    tick(0.5, 500);
    const beforePause = object.x;

    object.status.pause();
    tick(1, 1500);
    const duringPause = object.x;

    object.status.resume();
    tick(0.5, 2000);
    const afterResume = object.x;

    destroy();
    return { beforePause, duringPause, afterResume };
  });

  expect(positions).toEqual({
    beforePause: 10,
    duringPause: 10,
    afterResume: 20
  });
});

const fixtureUrl = "/src/engine/game-objects/game-object/tests/fixture.ts";

async function createScene(page: Page): Promise<JSHandle<fixture.LifecycleScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createLifecycleScene } = await import(url) as typeof fixture;
    return createLifecycleScene();
  }, fixtureUrl);
}
