import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#game/platforms/tests/static-platform";

test("a stationary platform stays in the static collision tree", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ world, platform, destroy }) => {
    const collision = world.findCollisions(5, 0, 6, 1);
    const best = world.findBestCollision(5, 0, 6, 1, () => 0);

    const result = {
      staticPlatformFound: collision.some(({ object }) => object === platform),
      bestCollisionFound: best?.object === platform
    };

    destroy();
    return result;
  });

  expect(result).toEqual({ staticPlatformFound: true, bestCollisionFound: true });
});

test("a platform moves between collision trees as it moves and stops", async ({ page }) => {
  const scene = await createScene(page);

  const initial = await scene.evaluate(({ game, world, platform }) => {
    const inStaticTree = world.statics.searchFirst(5, 0, 10, 1) != null;

    platform.move(10, 0);
    game.canvas.start();

    return {
      inStaticTree,
      removedFromStaticTree: world.statics.searchFirst(5, 0, 10, 1) == null
    };
  });

  expect(initial).toEqual({ inStaticTree: true, removedFromStaticTree: true });

  await expect.poll(() => scene.evaluate(({ world }) => {
    return world.dynamics.searchFirst(15, 0, 20, 1) != null;
  })).toBe(true);

  await expect.poll(() => scene.evaluate(({ world }) => {
    return world.statics.searchFirst(15, 0, 20, 1) != null;
  }), { timeout: 4000 }).toBe(true);

  await scene.evaluate(({ destroy }) => destroy());
});

test("a moving collider changes its collision kind on the next frame", async ({ page }) => {
  const scene = await createScene(page);

  await scene.evaluate(({ game, platform }) => {
    platform.move(10, 0);
    game.canvas.start();
  });

  await expect.poll(() => scene.evaluate(({ world }) => {
    return world.dynamics.searchFirst(15, 0, 20, 1) != null;
  })).toBe(true);

  await scene.evaluate(({ platform }) => platform.collision.toInteract());

  await expect.poll(() => scene.evaluate(({ world }) => {
    return {
      solid: world.dynamics.searchFirst(15, 0, 20, 1) != null,
      interact: world.dynamicInteracts.searchFirst(15, 0, 20, 1) != null
    };
  })).toEqual({ solid: false, interact: true });

  await scene.evaluate(({ destroy }) => destroy());
});

test("a stationary platform still allows a small step up", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ player, platform, destroy }) => {
    player.updateStats(() => ({ onGround: true }));
    player.move(2, 0);

    const result = {
      x: player.x,
      y: player.y,
      allowed: platform.allows(player, "stepUp", 8),
      rejected: platform.allows(player, "stepUp", 9)
    };

    destroy();
    return result;
  });

  expect(result.x).toBe(6);
  expect(result.y).toBeCloseTo(1, 2);
  expect(result.allowed).toBe(true);
  expect(result.rejected).toBe(false);
});

async function createScene(page: Page): Promise<JSHandle<fixture.StaticPlatformScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createStaticPlatformScene } = await import(url) as typeof fixture;
    return createStaticPlatformScene();
  }, "/src/game/platforms/tests/static-platform.ts");
}
