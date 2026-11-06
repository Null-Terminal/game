import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game/tests/fixture";

test("level loading pauses the canvas and reports its lifecycle", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, canvas, createWorld, destroy }) => {
    const events: string[] = [];
    const off = game.onLevelLoad(
      () => events.push("loading"),
      () => events.push("loaded")
    );

    let completeLoad!: (world: ReturnType<typeof createWorld>) => void;
    const pendingWorld = new Promise<ReturnType<typeof createWorld>>((resolve) => {
      completeLoad = resolve;
    });

    const loading = game.loadLevel(() => pendingWorld);
    const duringLoad = {
      loading: game.status.loadingLevel,
      paused: canvas.paused,
      events: [...events]
    };

    completeLoad(createWorld());
    const world = await loading;

    const afterLoad = {
      activeWorld: game.world === world,
      loading: game.status.loadingLevel,
      paused: canvas.paused,
      events: [...events]
    };

    off();
    destroy();

    return { duringLoad, afterLoad };
  });

  expect(result.duringLoad).toEqual({
    loading: true,
    paused: true,
    events: ["loading"]
  });

  expect(result.afterLoad).toEqual({
    activeWorld: true,
    loading: false,
    paused: false,
    events: ["loading", "loaded"]
  });
});

test("a failed load preserves the current world and reports the error", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, canvas, createWorld, destroy }) => {
    const original = await game.loadLevel(async () => createWorld());
    const events: string[] = [];

    game.onLevelLoad(
      () => events.push("loading"),
      () => events.push("loaded"),
      (error) => events.push(error instanceof Error ? error.message : String(error))
    );

    let message = "";

    try {
      await game.loadLevel(async () => {
        throw new Error("broken level");
      });

    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    const result = {
      message,
      events,
      originalActive: game.world === original && !original.destroyed,
      loading: game.status.loadingLevel,
      paused: canvas.paused
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    message: "broken level",
    events: ["loading", "broken level"],
    originalActive: true,
    loading: false,
    paused: false
  });
});

test("restart loads a fresh world without reloading the page", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, canvas, createWorld, destroy }) => {
    let loadCount = 0;

    const first = await game.loadLevel(async () => {
      loadCount++;
      return createWorld();
    });

    game.camera.x = 100;
    game.status.pause();
    game.status.resume();

    await game.status.restart();

    const result = {
      loadCount,
      firstDestroyed: first.destroyed,
      newWorld: game.world !== first,
      cameraX: game.camera.x,
      playing: game.status.playing,
      paused: canvas.paused
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    loadCount: 2,
    firstDestroyed: true,
    newWorld: true,
    cameraX: 0,
    playing: true,
    paused: false
  });
});

const fixtureUrl = "/src/engine/game/tests/fixture.ts";

async function createScene(page: Page): Promise<JSHandle<fixture.LevelScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createLevelScene } = await import(url) as typeof fixture;
    return createLevelScene();
  }, fixtureUrl);
}
