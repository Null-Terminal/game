import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game-objects/game-object/tests/fixture";

test("reusing an object resets its position and size", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ pool, createProbe, destroy }) => {
    const first = createProbe({ x: 42, y: 24 });
    first.object.resize(9, 4);

    pool.delete(...first.pointer);

    const second = createProbe();
    const result = {
      reused: second.object === first.object,
      geometry: [second.object.x, second.object.y, second.object.width, second.object.height]
    };

    destroy();
    return result;
  });

  expect(result).toEqual({ reused: true, geometry: [0, 0, 0, 0] });
});

test("destroying an object removes its movement subscription", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ pool, canvas, createProbe, destroy }) => {
    const first = createProbe({ movement: { at: (distance) => [distance, 0] } });
    const subscribed = canvas.events.beforeRender.size;

    pool.delete(...first.pointer);
    const removed = canvas.events.beforeRender.size;

    const second = createProbe();
    const result = {
      subscribed,
      removed,
      reused: second.object === first.object,
      afterReuse: canvas.events.beforeRender.size
    };

    destroy();
    return result;
  });

  expect(result).toEqual({ subscribed: 2, removed: 1, reused: true, afterReuse: 1 });
});

test("animation listeners do not survive pool reuse", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ pool, createAnimatedProbe, destroy }) => {
    const first = createAnimatedProbe();
    const event = first.object.animation.events.test;

    first.object.animation.on(event, () => {});
    const subscribed = event instanceof Set ? event.size : event.length;

    pool.delete(...first.pointer);

    const second = createAnimatedProbe();
    const result = {
      subscribed,
      removed: event instanceof Set ? event.size : event.length,
      reused: second.object === first.object,
      afterReuse: second.object.animation.events.test instanceof Set ?
        second.object.animation.events.test.size :
        second.object.animation.events.test.length
    };

    destroy();
    return result;
  });

  expect(result).toEqual({ subscribed: 1, removed: 0, reused: true, afterReuse: 0 });
});

test("a failed subclass creation rolls back the pool", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ pool, createFailingProbe, destroy }) => {
    let error = "";

    try {
      createFailingProbe();

    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }

    const entries = Object.values(pool.objects).reduce((count, store) => count + store.length, 0);

    destroy();
    return { error, entries };
  });

  expect(result).toEqual({ error: "late failure", entries: 0 });
});

test("play preserves auxiliary render listeners until destroy", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ createProbe, canvas, destroy }) => {
    const { object } = createProbe();
    let ticks = 0;

    object.render.on(canvas.events.main, () => {
      ticks++;
    });

    object.play(() => ({ draw() {} }));
    object.play(() => ({ draw() {} }));

    const subscribed = canvas.events.main.size;

    const ctx = canvas.canvas.getContext("2d")!;
    canvas.emitter.emit(canvas.events.main, { ctx, now: 1, delta: 0.016 });

    object.destroy();

    const result = {
      subscribed,
      ticks,
      remaining: canvas.events.main.size,
      playing: object.nowPlaying
    };

    destroy();
    return result;
  });

  expect(result).toEqual({ subscribed: 2, ticks: 1, remaining: 0, playing: null });
});

test("switching playback keeps its render position and restarts elapsed time", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ createProbe, canvas, destroy }) => {
    const { object } = createProbe();
    const calls: string[] = [];
    const elapsed: number[] = [];
    const ctx = canvas.canvas.getContext("2d")!;

    object.play(() => ({
      draw: (frame) => {
        calls.push("first");
        elapsed.push(frame.elapsed);
      }
    }));

    canvas.emitter.on(canvas.events.main, () => calls.push("later"));

    const emit = (now: number) => {
      canvas.emitter.emit(canvas.events.main, { ctx, now, delta: 1 });
    };

    emit(1);
    emit(2);

    object.play(() => ({
      draw: (frame) => {
        calls.push("second");
        elapsed.push(frame.elapsed);
      }
    }));

    emit(3);
    emit(4);

    destroy();
    return { calls, elapsed };
  });

  expect(result).toEqual({
    calls: ["first", "later", "first", "later", "second", "later", "second", "later"],
    elapsed: [0, 1, 0, 1]
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
