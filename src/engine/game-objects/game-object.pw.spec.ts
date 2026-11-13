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

test("destroy releases its pool slot and reindexes the last object", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ pool, createProbe, destroy }) => {
    const first = createProbe();
    const second = createProbe();

    first.object.destroy();
    first.object.destroy();

    const result = {
      firstDestroyed: first.object.destroyed,
      moved: pool.get(...first.pointer) === second.object,
      movedIndex: second.object.poolPointer[1],
      activeCount: pool.objects[first.pointer[0]]!.length
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    firstDestroyed: true,
    moved: true,
    movedIndex: 0,
    activeCount: 1
  });
});

test("destroy releases its pool slot when a destructor fails", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ pool, createProbe, destroy }) => {
    const { object, pointer } = createProbe();
    object.onDestroy(() => {
      throw new Error("cleanup failed");
    });

    let error = "";

    try {
      object.destroy();

    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }

    const result = {
      error,
      destroyed: object.destroyed,
      activeCount: pool.objects[pointer[0]]!.length
    };

    destroy();
    return result;
  });

  expect(result).toEqual({ error: "cleanup failed", destroyed: true, activeCount: 0 });
});

test("inspection shows the top object or every overlapping object in draw order", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ canvas, createProbe, destroy }) => {
    const first = createProbe({ x: 10, y: 10, name: "behind", debug: { inspect: true } }).object;
    const second = createProbe({ x: 10, y: 10, name: "front", debug: { inspect: true } }).object;

    for (const object of [first, second]) {
      object.resize(20, 20);
      object.play(function still() {
        return { draw() {} };
      });
    }

    const context = canvas.canvas.getContext("2d")!;
    canvas.emitter.emit(canvas.events.main, { ctx: context, now: 1, delta: 0 });
    second.status.pause();

    const tables: unknown[] = [];
    const original = console.table;
    console.table = (rows) => tables.push(rows);

    try {
      const bounds = canvas.canvas.getBoundingClientRect();
      const click = new MouseEvent("click", {
        clientX: bounds.left + bounds.width * 0.2,
        clientY: bounds.top + bounds.height * 0.8
      });

      canvas.canvas.dispatchEvent(click);
      canvas.canvas.dispatchEvent(new MouseEvent("click", {
        clientX: click.clientX,
        clientY: click.clientY,
        ctrlKey: true
      }));

    } finally {
      console.table = original;
    }

    destroy();
    return tables;
  });

  expect(result).toMatchObject([
    [{ type: "Probe", name: "front", animation: "still", status: "paused", layer: "main", drawOrder: 2 }],
    [
      { name: "behind", drawOrder: 1 },
      { name: "front", drawOrder: 2 }
    ]
  ]);
});

test("inspection keeps the animation shown in the last rendered frame", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(({ canvas, createProbe, destroy }) => {
    const { object } = createProbe({ x: 10, y: 10, debug: { inspect: true } });
    object.resize(20, 20);

    object.play(function first() {
      return { draw() {} };
    });

    const ctx = canvas.canvas.getContext("2d")!;
    canvas.emitter.emit(canvas.events.main, { ctx, now: 1, delta: 0 });

    object.play(function second() {
      return { draw() {} };
    });

    let rows: unknown[] = [];
    const original = console.table;
    console.table = (value) => { rows = value; };

    try {
      const rect = canvas.canvas.getBoundingClientRect();
      canvas.canvas.dispatchEvent(new MouseEvent("click", {
        clientX: rect.left + rect.width * 0.2,
        clientY: rect.top + rect.height * 0.8
      }));

    } finally {
      console.table = original;
      destroy();
    }

    return rows;
  });

  expect(result).toMatchObject([{ animation: "first" }]);
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
