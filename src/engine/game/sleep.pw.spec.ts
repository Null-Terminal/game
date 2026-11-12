import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game/tests/sleep-fixture";

type SleepScene = Awaited<ReturnType<typeof fixture.createSleepScene>>;

test("distant objects start asleep and resume movement, rendering, and collisions nearby", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, canvas, world, probe, initialStaticInsertions, destroy }) => {
    const bounds = [350, 0, 360, 10] as const;
    const asleep = {
      sleeping: probe.status.sleeping,
      collides: world.hasCollision(...bounds),
      frameListeners: canvas.events.beforeRender.length,
      sceneListeners: canvas.events.scene.length,
      collisionListeners: canvas.events.scene.flush!.length
    };

    game.camera.x = 300;
    game.sleep.update();

    const awake = {
      sleeping: probe.status.sleeping,
      collides: world.hasCollision(...bounds),
      frameListeners: canvas.events.beforeRender.length,
      sceneListeners: canvas.events.scene.length,
      collisionListeners: canvas.events.scene.flush!.length
    };

    const ctx = canvas.canvas.getContext("2d")!;
    const frame = { ctx, now: 16, delta: 0.016 };
    canvas.emitter.emit(canvas.events.beforeRender, frame);
    canvas.emitter.emit(canvas.events.scene, frame);

    const resumed = { x: probe.x, renderTicks: probe.renderTicks };

    game.camera.x = 0;
    game.sleep.update();

    canvas.emitter.emit(canvas.events.beforeRender, { ...frame, now: 32 });
    canvas.emitter.emit(canvas.events.scene, { ...frame, now: 32 });

    const frozen = { x: probe.x, renderTicks: probe.renderTicks };
    destroy();

    return { initialStaticInsertions, asleep, awake, resumed, frozen };
  });

  expect(result.initialStaticInsertions).toBe(0);
  expect(result.asleep).toEqual({
    sleeping: true,
    collides: false,
    frameListeners: result.awake.frameListeners - 1,
    sceneListeners: result.awake.sceneListeners - 1,
    collisionListeners: result.awake.collisionListeners - 1
  });

  expect(result.awake.sleeping).toBe(false);
  expect(result.awake.collides).toBe(true);

  expect(result.resumed.x).toBeGreaterThan(350);
  expect(result.resumed.renderTicks).toBe(1);
  expect(result.frozen).toEqual(result.resumed);
});

test("distance wakeup preserves a manually paused object", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, world, probe, destroy }) => {
    probe.status.pause();
    game.sleep.update();

    game.camera.x = 300;
    game.sleep.update();

    const stillPaused = {
      sleeping: probe.status.sleeping,
      paused: probe.status.paused,
      collides: world.hasCollision(350, 0, 360, 10)
    };

    probe.status.resume();

    const resumed = {
      sleeping: probe.status.sleeping,
      paused: probe.status.paused,
      collides: world.hasCollision(350, 0, 360, 10)
    };

    destroy();
    return { stillPaused, resumed };
  });

  expect(result.stillPaused).toEqual({ sleeping: false, paused: true, collides: true });
  expect(result.resumed).toEqual({ sleeping: false, paused: false, collides: true });
});

test("the camera target stays awake even outside the viewport", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, world, probe, destroy }) => {
    const unbind = game.camera.bindTo(probe);
    game.sleep.update();

    const sleeping = probe.status.sleeping;
    const collides = world.hasCollision(350, 0, 360, 10);

    unbind();
    destroy();

    return { sleeping, collides };
  });

  expect(result).toEqual({ sleeping: false, collides: true });
});

test("parallax backgrounds sleep by their projected bounds while screen-fixed backgrounds stay awake", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, createBackground, destroy }) => {
    const bbox: [number, number, number, number] = [90, 0, 100, 10];
    const parallax = createBackground({ bbox, scrollFactor: [0.25, 1] });
    const fixed = createBackground({ bbox, static: "w" });

    game.camera.x = 400;
    game.sleep.update();

    const near = { parallax: parallax.status.sleeping, fixed: fixed.status.sleeping };

    game.camera.x = 1600;
    game.sleep.update();

    const far = { parallax: parallax.status.sleeping, fixed: fixed.status.sleeping };

    game.camera.x = 400;
    game.sleep.update();

    const returned = { parallax: parallax.status.sleeping, fixed: fixed.status.sleeping };
    destroy();

    return { near, far, returned };
  });

  expect(result.near).toEqual({ parallax: false, fixed: false });
  expect(result.far).toEqual({ parallax: true, fixed: false });
  expect(result.returned).toEqual({ parallax: false, fixed: false });
});

async function createScene(page: Page): Promise<JSHandle<SleepScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const module = await import(url) as typeof fixture;
    return module.createSleepScene();
  }, "/src/engine/game/tests/sleep-fixture.ts");
}
