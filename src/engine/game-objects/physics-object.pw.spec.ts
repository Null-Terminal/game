import { expect, test, type JSHandle, type Page } from "@playwright/test";

import { CollisionStatus } from "#engine/game-objects/physics-object";
import type * as fixture from "#engine/game-objects/physics-object/tests/fixture";
import type { BBoxTuple } from "#engine/rtree";

test("a large step stops at the nearest obstacle", async ({ page }) => {
  const scene = await createScene(page, [
    [5, 0, 6, 10],
    [8, 0, 9, 10]
  ]);

  const result = await scene.evaluate(({ obstacles, createProbe, destroy }) => {
    const object = createProbe();
    const status = object.move(10, 0);

    const result = {
      x: object.x,
      status,
      visits: obstacles.map(({ visits }) => visits)
    };

    destroy();
    return result;
  });

  expect(result.x).toBe(4);
  expect(result.status & CollisionStatus.RightCollision).toBeTruthy();

  expect(result.visits).toEqual([1, 0]);
});

test("a fractional step cannot cross a thinner obstacle", async ({ page }) => {
  const scene = await createScene(page, [[0.5, 0, 0.6, 10]]);

  const result = await scene.evaluate(({ createFractionalProbe, destroy }) => {
    const object = createFractionalProbe();
    const status = object.move(0.5, 0);

    const result = { x: object.x, status };

    destroy();
    return result;
  });

  expect(result.x).toBeCloseTo(0.3, 10);
  expect(result.status & CollisionStatus.RightCollision).toBeTruthy();
});

test("a partial downward move reports landing", async ({ page }) => {
  const scene = await createScene(page, [[0, 0, 10, 1]]);

  const result = await scene.evaluate(({ createProbe, destroy }) => {
    const object = createProbe({ y: 5 });
    const status = object.move(0, -10);

    const result = { y: object.y, status };

    destroy();
    return result;
  });

  expect(result.y).toBe(1);
  expect(result.status & CollisionStatus.BottomCollision).toBeTruthy();
});

test("an infinite floor keeps the rider's horizontal coordinate finite", async ({ page }) => {
  const scene = await createScene(page, [[-Infinity, 0, Infinity, 1]]);

  const result = await scene.evaluate(({ createTallProbe, destroy }) => {
    const go = createTallProbe({ x: 50, y: 1 });
    const first = go.move(0, -0.5);
    const second = go.move(0, -0.5);

    const result = { x: go.x, y: go.y, first, second };

    destroy();
    return result;
  });

  expect(result.x).toBe(50);
  expect(result.y).toBeCloseTo(1, 2);
  expect(result.first & CollisionStatus.BottomCollision).toBeTruthy();
  expect(result.second & CollisionStatus.BottomCollision).toBeTruthy();
});

test("movement stops at left and upper obstacle edges", async ({ page }) => {
  const scene = await createScene(page, [
    [-5, 0, -4, 10],
    [0, 5, 10, 6]
  ]);

  const result = await scene.evaluate(({ obstacles, createProbe, destroy }) => {
    const object = createProbe();

    const left = object.move(-10, 0);
    const x = object.x;

    object.x = 0;

    const top = object.move(0, 10);

    const result = {
      x,
      y: object.y,
      left,
      top,
      visits: obstacles.map(({ visits }) => visits)
    };

    destroy();
    return result;
  });

  expect(result.x).toBe(-4);
  expect(result.left & CollisionStatus.LeftCollision).toBeTruthy();

  expect(result.y).toBe(4);
  expect(result.top & CollisionStatus.TopCollision).toBeTruthy();

  expect(result.visits).toEqual([1, 1]);
});

const fixtureUrl = "/src/engine/game-objects/physics-object/tests/fixture.ts";

async function createScene(page: Page, bounds: BBoxTuple[]): Promise<JSHandle<fixture.MovementScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async ({ url, bounds }) => {
    const { createMovementScene } = await import(url) as typeof fixture;
    return createMovementScene(bounds);
  }, { url: fixtureUrl, bounds });
}
