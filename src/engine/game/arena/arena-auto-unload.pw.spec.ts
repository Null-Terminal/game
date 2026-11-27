import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game/tests/arena-fixture";

test("an arena unloads only after all its objects are far from the camera", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, ArenaProbe, arenaOptions, destroy }) => {
    const arenas = Arenas.declare({ start: () => ({
      objects: [
        [ArenaProbe, { bbox: [0, 0, 20, 20] }],
        [ArenaProbe, { bbox: [800, 0, 820, 20] }]
      ]
    }) }, arenaOptions);

    arenas.preload(arenas.refs.start);

    const world = await game.loadLevel(async () => new World({
      persistentObjects: [],
      arenas
    }));

    game.canvas.stop();

    const arena = world.arenas.getByRef(world.arenas.refs["start"]!)!;
    const checkAt = performance.now() + 1000;
    world.arenas.checkAutoUnload(checkAt);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const nearObjectKeepsArena = arena.loaded;

    game.camera.x = 1200;
    world.arenas.checkAutoUnload(checkAt + 9);
    const loadedBeforeInterval = arena.loaded;

    world.arenas.checkAutoUnload(checkAt + 10);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const result = {
      nearObjectKeepsArena,
      loadedBeforeInterval,
      unloaded: arena.unloaded,
      collisionsGone: world.findCollisions(0, 0, 20, 20).length === 0,
      activeArenas: world.arenas.size
    };

    destroy();

    return result;
  });

  expect(result).toEqual({
    nearObjectKeepsArena: true,
    loadedBeforeInterval: true,
    unloaded: true,
    collisionsGone: true,
    activeArenas: 0
  });
});

test("a moving object keeps its original arena loaded while it is nearby", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, ArenaProbe, arenaOptions, destroy }) => {
    const arenas = Arenas.declare({ start: () => ({ objects: [[ArenaProbe, { bbox: [0, 0, 20, 20] }]] }) }, arenaOptions);
    arenas.preload(arenas.refs.start);

    const world = await game.loadLevel(async () => new World({
      persistentObjects: [],
      arenas
    }));

    game.canvas.stop();
    game.camera.x = 1000;

    const arena = world.arenas.getByRef(world.arenas.refs["start"]!)!;
    const moving = world.objects.get(ArenaProbe.kind, 0);

    if (!(moving instanceof ArenaProbe)) {
      throw new Error("Moving arena probe was not created");
    }

    moving.motion.toKinematic();
    moving.move(950, 0);

    const checkAt = performance.now() + 1000;
    world.arenas.checkAutoUnload(checkAt);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const loadedWhileNearby = arena.loaded;

    moving.move(-950, 0);
    world.arenas.checkAutoUnload(checkAt + 10);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const unloadedAfterLeaving = arena.unloaded;
    destroy();

    return { loadedWhileNearby, unloadedAfterLeaving };
  });

  expect(result).toEqual({ loadedWhileNearby: true, unloadedAfterLeaving: true });
});

test("pinned arenas stay loaded until explicitly unloaded", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, ArenaProbe, arenaOptions, destroy }) => {
    const arenas = Arenas.declare({
      start: () => ({ objects: [[ArenaProbe, { bbox: [0, 0, 20, 20] }]] }),
      pinned: () => ({ objects: [[ArenaProbe, { bbox: [1000, 0, 1020, 20] }]], autoUnload: false })
    }, arenaOptions);

    arenas.preload(arenas.refs.start, arenas.refs.pinned);

    const world = await game.loadLevel(async () => new World({
      persistentObjects: [],
      arenas
    }));

    game.canvas.stop();

    const pinned = world.arenas.getByRef(arenas.refs.pinned)!;
    world.arenas.checkAutoUnload(performance.now() + 1000);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const stayedLoaded = pinned.loaded;
    await world.arenas.unloadArena(pinned);

    const explicitlyUnloaded = pinned.unloaded;
    await world.arenas.restoreArena(pinned);

    const result = {
      stayedLoaded,
      explicitlyUnloaded,
      restored: pinned.loaded,
      collision: world.findCollisions(1000, 0, 1020, 20).length
    };

    destroy();

    return result;
  });

  expect(result).toEqual({
    stayedLoaded: true,
    explicitlyUnloaded: true,
    restored: true,
    collision: 1
  });
});

test("the automatic unload rechecks distance before committing", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, ArenaProbe, arenaOptions, destroy }) => {
    const arenas = Arenas.declare({
      start: () => ({ objects: [[ArenaProbe, { bbox: [1000, 0, 1020, 20] }]] })
    }, arenaOptions);

    arenas.preload(arenas.refs.start);

    const world = await game.loadLevel(async () => new World({
      persistentObjects: [],
      arenas
    }));

    const arena = world.arenas.getByRef(world.arenas.refs["start"]!)!;
    world.arenas.checkAutoUnload(performance.now() + 1000);

    game.camera.x = 900;
    world.arenas.flush();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const stayedLoaded = arena.loaded;
    destroy();

    return stayedLoaded;
  });

  expect(result).toBe(true);
});

test("loading a ref waits for a queued automatic unload", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, ArenaProbe, arenaOptions, destroy }) => {
    const declaration = Arenas.declare({
      start: () => ({ objects: [[ArenaProbe, { bbox: [1000, 0, 1020, 20] }]] })
    }, arenaOptions);

    declaration.preload(declaration.refs.start);

    const world = await game.loadLevel(async () => new World({ persistentObjects: [], arenas: declaration }));
    const arena = world.arenas.getByRef(declaration.refs.start)!;

    world.arenas.checkAutoUnload(performance.now() + 1000);
    const loaded = await world.arenas.loadArena(declaration.refs.start);

    const result = { sameArena: loaded === arena, loaded: loaded.loaded };
    game.camera.x = 900;
    world.arenas.flush();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    destroy();

    return result;
  });

  expect(result).toEqual({ sameArena: true, loaded: true });
});

test("automatic unload follows the current game setting", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, ArenaProbe, arenaOptions, destroy }) => {
    const declaration = Arenas.declare({
      start: () => ({ objects: [[ArenaProbe, { bbox: [1000, 0, 1020, 20] }]] })
    }, arenaOptions);

    declaration.preload(declaration.refs.start);

    const world = await game.loadLevel(async () => new World({ persistentObjects: [], arenas: declaration }));
    const arena = world.arenas.getByRef(declaration.refs.start)!;
    game.canvas.stop();

    world.arenas.checkAutoUnload(performance.now() + 1000);
    game.settings.set("arenaUnload", null);
    world.arenas.flush();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const stayedLoaded = arena.loaded;

    game.settings.set("arenaUnload", { distanceScreens: 1 });
    world.arenas.checkAutoUnload(performance.now() + 2000);
    world.arenas.flush();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const { unloaded } = arena;

    destroy();
    return { stayedLoaded, unloaded };
  });

  expect(result).toEqual({ stayedLoaded: true, unloaded: true });
});

async function createScene(page: Page): Promise<JSHandle<fixture.ArenaScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createArenaScene } = await import(url) as typeof fixture;
    return createArenaScene({ unload: { checkInterval: 10 } }, 1);
  }, "/src/engine/game/tests/arena-fixture.ts");
}
