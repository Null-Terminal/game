import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game/tests/arena-fixture";

test("a preloaded arena shares the world's collision trees", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, GlobalProbe, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const arena = world.arenas.getByRef(world.arenas.refs["start"]!)!;
    const collision = world.findCollisions(0, 0, 20, 20);

    const result = {
      activeArenas: world.arenas.size,
      arenaObjects: arena.size,
      collisionCount: collision.length,
      collisionInArena: collision[0]?.object.arena === arena,
      globalObjects: world.objects.objects[GlobalProbe.kind]?.length
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    activeArenas: 1,
    arenaObjects: 1,
    collisionCount: 1,
    collisionInArena: true,
    globalObjects: 1
  });
});

test("a preloaded arena source can access the world's arena manager", async ({ page }) => {
  const scene = await createScene(page);

  const accessed = await scene.evaluate(async ({ game, Arenas, World, destroy }) => {
    let world: InstanceType<typeof World>;
    let sourceSawManager = false;

    const declaration = Arenas.declare({
      start: () => {
        sourceSawManager = world.arenas.refs["start"] === declaration.refs.start;
        return { objects: [] };
      }
    });

    declaration.preload(declaration.refs.start);
    world = new World({ persistentObjects: [], arenas: declaration });
    await game.loadLevel(async () => world);

    destroy();
    return sourceSawManager;
  });

  expect(accessed).toBe(true);
});

test("declared arena refs reuse and restore the same arena", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, Arena, Arenas, World, ArenaProbe, destroy }) => {
    const arenas = Arenas.declare({
      start: () => ({ objects: [[ArenaProbe, { bbox: [0, 0, 20, 20] }]] }),
      next: () => ({ objects: [[ArenaProbe, { bbox: [40, 0, 60, 20] }]] })
    });
    arenas.preload(arenas.refs.start);

    const world = await game.loadLevel(async () => new World({ persistentObjects: [], arenas }));
    const start = world.arenas.getByRef(arenas.refs.start)!;
    const sameStart = await world.arenas.loadArena(arenas.refs.start);
    const next = await world.arenas.loadArena(arenas.refs.next);

    await world.arenas.unloadArena(next);
    const [restored, concurrent] = await Promise.all([
      world.arenas.loadArena(arenas.refs.next),
      world.arenas.loadArena(arenas.refs.next)
    ]);
    const dynamic = await world.arenas.loadArena(arenas.refs.next.source);
    const externalRef = Arena.ref(arenas.refs.next.source);
    const external = await world.arenas.loadArena(externalRef);
    const sameExternal = await world.arenas.loadArena(externalRef);

    const result = {
      preloaded: start.loaded,
      sameStart: sameStart === start,
      sameNext: restored === next && concurrent === next,
      dynamicIsSeparate: dynamic !== next,
      externalRefIsStable: external === sameExternal && external !== next,
      activeArenas: world.arenas.size
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    preloaded: true,
    sameStart: true,
    sameNext: true,
    dynamicIsSeparate: true,
    externalRefIsStable: true,
    activeArenas: 4
  });
});

test("an arena declaration creates independent managers for each world", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, Arenas, World, ArenaProbe, destroy }) => {
    const declaration = Arenas.declare({
      start: () => ({ objects: [[ArenaProbe, { bbox: [0, 0, 20, 20] }]] })
    });
    declaration.preload(declaration.refs.start);

    const first = await game.loadLevel(async () => new World({ persistentObjects: [], arenas: declaration }));
    const firstArena = first.arenas.getByRef(declaration.refs.start)!;
    const second = await game.loadLevel(async () => new World({ persistentObjects: [], arenas: declaration }));

    const result = {
      separateManagers: first.arenas !== second.arenas,
      firstArenaDestroyed: firstArena.destroyed,
      secondArenaLoaded: second.arenas.getByRef(declaration.refs.start)?.loaded === true
    };

    destroy();
    return result;
  });

  expect(result).toEqual({ separateManagers: true, firstArenaDestroyed: true, secondArenaLoaded: true });
});

test("loading a ref waits for a queued unload", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const ref = world.arenas.refs["start"]!;
    const arena = world.arenas.getByRef(ref)!;

    const unloading = world.arenas.unloadArena(arena);
    const loading = world.arenas.loadArena(ref);
    const restored = await loading;
    await unloading;

    const result = { sameArena: restored === arena, loaded: restored.loaded };
    destroy();
    return result;
  });

  expect(result).toEqual({ sameArena: true, loaded: true });
});

test("loading a ref waits for a queued destroy and creates one replacement", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const ref = world.arenas.refs["start"]!;
    const arena = world.arenas.getByRef(ref)!;

    const destroying = world.arenas.destroyArena(arena);
    const [replacement, concurrent] = await Promise.all([
      world.arenas.loadArena(ref),
      world.arenas.loadArena(ref)
    ]);
    await destroying;

    const result = {
      oldArenaDestroyed: arena.destroyed,
      newArenaLoaded: replacement.loaded,
      differentArena: replacement !== arena,
      sharedReplacement: replacement === concurrent
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    oldArenaDestroyed: true,
    newArenaLoaded: true,
    differentArena: true,
    sharedReplacement: true
  });
});

test("arenas can overlap and unload independently", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, ArenaProbe, GlobalProbe, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const first = world.arenas.getByRef(world.arenas.refs["start"]!)!;

    const second = await world.arenas.loadArena(() => ({
      objects: [[ArenaProbe, { bbox: [10, 0, 30, 20] }]]
    }));

    const collisionsBefore = world.findCollisions(10, 0, 20, 20).length;
    await world.arenas.unloadArena(first);

    const result = {
      collisionsBefore,
      collisionsAfter: world.findCollisions(10, 0, 20, 20).length,
      firstUnloaded: first.unloaded,
      startPreserved: world.arenas.getByRef(world.arenas.refs["start"]!) === first,
      secondAlive: !second.destroyed,
      globalAlive: world.objects.objects[GlobalProbe.kind]?.length === 1,
      activeArenas: world.arenas.size
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    collisionsBefore: 2,
    collisionsAfter: 1,
    firstUnloaded: true,
    startPreserved: true,
    secondAlive: true,
    globalAlive: true,
    activeArenas: 1
  });
});

test("composed children belong to their parent's arena", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, ChildProbe, CompositeProbe, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const arena = await world.arenas.loadArena(() => ({ objects: [[CompositeProbe, {}]] }));
    const child = world.objects.objects[ChildProbe.kind]?.buffer[0];

    const childInArena = child?.arena === arena;
    const objectsBefore = arena.size;

    await world.arenas.unloadArena(arena);

    const result = {
      childInArena,
      objectsBefore,
      childDestroyed: child?.destroyed,
      arenaEmpty: arena.size === 0,
      poolEmpty: world.objects.objects[ChildProbe.kind]?.length === 0
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    childInArena: true,
    objectsBefore: 2,
    childDestroyed: true,
    arenaEmpty: true,
    poolEmpty: true
  });
});

test("a failed preloaded arena leaves the previous level active", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, createWorld, destroy }) => {
    const previous = await game.loadLevel(async () => createWorld());

    game.camera.x = 48;

    let message = "";

    try {
      await game.loadLevel(async () => {
        const arenas = Arenas.declare({ start: async () => {
          throw new Error("arena failed");
        } });
        arenas.preload(arenas.refs.start);
        return new World({ persistentObjects: [], arenas });
      });

    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }

    const result = {
      message,
      sameWorld: game.world === previous,
      previousAlive: !previous.destroyed,
      cameraX: game.camera.x,
      collisions: previous.findCollisions(0, 0, 20, 20).length
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    message: "arena failed",
    sameWorld: true,
    previousAlive: true,
    cameraX: 48,
    collisions: 1
  });
});

test("a partially created arena rolls back all its objects", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, ArenaProbe, FailingArenaProbe, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());

    let message = "";

    try {
      await world.arenas.loadArena(() => ({
        objects: [
          [ArenaProbe, { bbox: [50, 0, 70, 20] }],
          [FailingArenaProbe, {}]
        ]
      }));

    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }

    const result = {
      message,
      activeArenas: world.arenas.size,
      rolledBackCollision: world.findCollisions(50, 0, 70, 20).length === 0,
      startStillPresent: world.findCollisions(0, 0, 20, 20).length === 1
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    message: "arena object failed",
    activeArenas: 1,
    rolledBackCollision: true,
    startStillPresent: true
  });
});

test("loading another level unloads its arenas and global objects", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, createWorld, destroy }) => {
    const first = await game.loadLevel(async () => createWorld());
    const oldArena = first.arenas.getByRef(first.arenas.refs["start"]!)!;
    const next = await game.loadLevel(async () => createWorld(50));

    const result = {
      oldWorldDestroyed: first.destroyed,
      oldArenaDestroyed: oldArena.destroyed,
      oldPoolEmpty: Object.values(first.objects.objects).every((store) => store.length === 0),
      newWorldActive: game.world === next,
      oldCollisionAbsent: next.findCollisions(0, 0, 20, 20).length === 0,
      newCollisionPresent: next.findCollisions(50, 0, 70, 20).length === 1
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    oldWorldDestroyed: true,
    oldArenaDestroyed: true,
    oldPoolEmpty: true,
    newWorldActive: true,
    oldCollisionAbsent: true,
    newCollisionPresent: true
  });
});

test("destroying the previous level keeps the new camera target", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, World, CameraProbe, destroy }) => {
    const createWorld = () => new World({ persistentObjects: [[CameraProbe, { x: 10 }]] });

    const first = await game.loadLevel(async () => createWorld());
    const firstTarget = game.camera.target;

    await game.loadLevel(async () => createWorld());

    const result = {
      firstWorldDestroyed: first.destroyed,
      newTargetAlive: game.camera.target?.destroyed === false,
      targetReplaced: game.camera.target !== firstTarget
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    firstWorldDestroyed: true,
    newTargetAlive: true,
    targetReplaced: true
  });
});

test("a failing world destructor still unloads its arena", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const arena = world.arenas.getByRef(world.arenas.refs["start"]!)!;

    world.onDestroy(() => {
      throw new Error("destructor failed");
    });

    let message = "";

    try {
      world.destroy();

    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }

    const result = {
      message,
      arenaDestroyed: arena.destroyed,
      poolEmpty: Object.values(world.objects.objects).every((store) => store.length === 0)
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    message: "destructor failed",
    arenaDestroyed: true,
    poolEmpty: true
  });
});

async function createScene(page: Page): Promise<JSHandle<fixture.ArenaScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createArenaScene } = await import(url) as typeof fixture;
    return createArenaScene();
  }, "/src/engine/game/tests/arena-fixture.ts");
}
