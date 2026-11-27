import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game/tests/sleep-fixture";

type SleepScene = Awaited<ReturnType<typeof fixture.createSleepScene>>;

test("destroy removes an object before the sleep update", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, world, probe, destroy }) => {
    const pointer = [...probe.poolPointer] as const;
    probe.destroy();
    game.sleep.update();

    const result = {
      destroyed: probe.destroyed,
      inPool: world.objects.has(...pointer)
    };

    destroy();

    return result;
  });

  expect(result).toEqual({ destroyed: true, inPool: false });
});

test("changing sleep settings wakes and resleeps distant objects", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, probe, destroy }) => {
    const initial = probe.status.sleeping;

    game.settings.set("sleep", null);
    const disabled = probe.status.sleeping;

    game.settings.set("sleep", { distanceScreens: 2 });
    game.sleep.update();
    const enabled = probe.status.sleeping;

    destroy();
    return { initial, disabled, enabled };
  });

  expect(result).toEqual({ initial: true, disabled: false, enabled: true });
});

test("distant objects start asleep and resume movement, rendering, and collisions nearby", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, canvas, world, probe, initialStaticInsertions, destroy }) => {
    const bounds = [350, 0, 360, 10] as const;
    const asleep = {
      sleeping: probe.status.sleeping,
      collides: world.hasCollision(...bounds)
    };

    game.camera.x = 300;
    game.sleep.update();

    const awake = {
      sleeping: probe.status.sleeping,
      collides: world.hasCollision(...bounds)
    };

    const ctx = canvas.canvas.getContext("2d")!;
    const frame = { ctx, now: 16, delta: 0.016 };
    canvas.events.beforeRender.emit(frame);
    canvas.events.scene.emit(frame);

    const resumed = { x: probe.x, renderTicks: probe.renderTicks };

    game.camera.x = 0;
    game.sleep.update();

    canvas.events.beforeRender.emit({ ...frame, now: 32 });
    canvas.events.scene.emit({ ...frame, now: 32 });

    const frozen = { x: probe.x, renderTicks: probe.renderTicks };
    destroy();

    return { initialStaticInsertions, asleep, awake, resumed, frozen };
  });

  expect(result.initialStaticInsertions).toBe(0);
  expect(result.asleep).toEqual({
    sleeping: true,
    collides: false
  });

  expect(result.awake.sleeping).toBe(false);
  expect(result.awake.collides).toBe(true);

  expect(result.resumed.x).toBeGreaterThan(350);
  expect(result.resumed.renderTicks).toBe(1);
  expect(result.frozen).toEqual(result.resumed);
});

test("distance wakeup preserves paused movement", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, canvas, probe, destroy }) => {
    probe.movement.pause();
    const initialX = probe.x;

    game.camera.x = 300;
    game.sleep.update();

    const ctx = canvas.canvas.getContext("2d")!;
    canvas.events.beforeRender.emit({ ctx, now: 100, delta: 1 });
    const pausedX = probe.x;

    probe.movement.resume();
    canvas.events.beforeRender.emit({ ctx, now: 200, delta: 1 });
    const resumedX = probe.x;

    const { sleeping } = probe.status;

    destroy();

    return { initialX, pausedX, resumedX, sleeping };
  });

  expect(result.pausedX).toBe(result.initialX);
  expect(result.resumedX).toBeGreaterThan(result.pausedX);
  expect(result.sleeping).toBe(false);
});

test("the camera target stays awake even outside the viewport", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, world, probe, destroy }) => {
    const unbind = game.camera.bindTo(probe);
    game.sleep.update();

    const { sleeping } = probe.status;
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

test("waking a background restores its original drawing order", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, canvas, createBackground, destroy }) => {
    const bbox: [number, number, number, number] = [90, 0, 100, 10];
    const first = createBackground({ bbox, sleep: false });
    const middle = createBackground({ bbox });
    const last = createBackground({ bbox, sleep: false });

    const drawOrder: string[] = [];
    first.render.on(canvas.events.background, () => drawOrder.push("first"));
    middle.render.on(canvas.events.background, () => drawOrder.push("middle"));
    last.render.on(canvas.events.background, () => drawOrder.push("last"));

    game.camera.x = 1600;
    game.sleep.update();

    game.camera.x = 0;
    game.sleep.update();

    const ctx = canvas.canvas.getContext("2d")!;
    canvas.events.background.emit({ ctx, now: 16, delta: 0.016 });

    destroy();

    return drawOrder;
  });

  expect(result).toEqual(["first", "middle", "last"]);
});

test("sleep checks use frame time instead of capped delta", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ game, canvas, probe, destroy }) => {
    const ctx = canvas.canvas.getContext("2d")!;
    const now = performance.now() + 1000;
    const tick = (time: number) => {
      canvas.events.beforeRender.emit({ ctx, now: time, delta: 0.001 });
    };

    game.camera.x = 300;
    tick(now);
    const awake = !probe.status.sleeping;

    game.camera.x = 0;
    game.settings.set("audio", { master: 0.8, effects: 1, music: 1 });
    tick(now + 99);
    const awakeBeforeInterval = !probe.status.sleeping;

    tick(now + 100);
    const sleepingAfterInterval = probe.status.sleeping;

    destroy();

    return { awake, awakeBeforeInterval, sleepingAfterInterval };
  });

  expect(result).toEqual({ awake: true, awakeBeforeInterval: true, sleepingAfterInterval: true });
});

async function createScene(page: Page): Promise<JSHandle<SleepScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const module = await import(url) as typeof fixture;
    return module.createSleepScene();
  }, "/src/engine/game/tests/sleep-fixture.ts");
}
