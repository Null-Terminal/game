import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game/tests/arena-fixture";

test("restoring an arena reuses its resolved definition", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, ArenaProbe, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    let sourceCalls = 0;

    const arena = await world.arenas.loadArena(() => {
      sourceCalls++;
      return { objects: [[ArenaProbe, { bbox: [50, 0, 70, 20] }]] };
    });

    await world.arenas.unloadArena(arena);
    await world.arenas.restoreArena(arena);

    const result = {
      sourceCalls,
      loaded: arena.loaded,
      restoredObject: world.objects.objects[ArenaProbe.kind]!.buffer.some((go) => go.arena === arena)
    };

    destroy();

    return result;
  });

  expect(result).toEqual({ sourceCalls: 1, loaded: true, restoredObject: true });
});

test("restoring an arena returns a moving collider to its saved position", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, canvas, ArenaProbe, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    canvas.stop();

    const arena = await world.arenas.loadArena(() => ({
      objects: [[ArenaProbe, { bbox: [50, 0, 70, 20] }]]
    }));

    const first = world.objects.objects[ArenaProbe.kind]!.buffer.find((go) => go.arena === arena);

    if (!(first instanceof ArenaProbe)) {
      throw new Error("Expected a collider in the arena");
    }

    first.motion.toKinematic();
    first.updateStats(() => ({ vx: 80 }));
    first.move(30, 0);

    const saved = arena.serialize();
    await world.arenas.unloadArena(arena);
    await world.arenas.restoreArena(arena);

    const restored = world.objects.objects[ArenaProbe.kind]!.buffer.find((go) => go.arena === arena);

    if (!(restored instanceof ArenaProbe)) {
      throw new Error("Expected a restored collider");
    }

    const result = {
      snapshot: saved.objects["root:0"],
      sameArena: arena.loaded,
      x: restored.x,
      vx: restored.stats.vx,
      kinematic: restored.motion.kinematic,
      collision: world.findCollisions(80, 0, 100, 20).some(({ object }) => object === restored)
    };

    destroy();

    return result;
  });

  expect(result.snapshot).toMatchObject({
    destroyed: false,
    state: { position: { x: 80, y: 0 }, stats: { vx: 80 }, motion: "kinematic" }
  });

  expect(result).toMatchObject({
    sameArena: true,
    x: 80,
    vx: 80,
    kinematic: true,
    collision: true
  });
});

test("a restored arena continues a route from its saved point", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, canvas, ArenaProbe, World, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    canvas.stop();

    const source = () => ({
      objects: World.of([[ArenaProbe, {
        bbox: [0, 40, 20, 60],
        movement: { path: [[0, 40], [100, 40]], speed: 100 }
      }]])
    });

    const arena = await world.arenas.loadArena(source);
    const first = world.objects.objects[ArenaProbe.kind]!.buffer.find((go) => go.arena === arena)!;

    const ctx = canvas.canvas.getContext("2d")!;
    const tick = (delta: number) => canvas.emitter.emit(canvas.events.beforeRender, { ctx, delta, now: 0 });

    tick(0.1);
    tick(0.25);

    const beforeUnload = first.x;
    const snapshot = JSON.parse(JSON.stringify(arena.serialize()));

    await world.arenas.unloadArena(arena);
    await world.arenas.restoreArena(arena);

    const restored = world.objects.objects[ArenaProbe.kind]!.buffer.find((go) => go.arena === arena)!;
    tick(0.25);

    const result = {
      beforeUnload,
      afterRestore: restored.x,
      route: snapshot.objects["root:0"].state.movement
    };

    destroy();

    return result;
  });

  expect(result).toEqual({
    beforeUnload: 25,
    afterRestore: 50,
    route: { kind: "path", elapsed: 0.35, pathIndex: 1 }
  });
});

test("a serialized arena keeps destroyed objects absent until a fresh load", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, ArenaProbe, World, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const source = () => ({
      objects: World.of([[ArenaProbe, { bbox: [40, 40, 60, 60] }]])
    });

    const arena = await world.arenas.loadArena(source);
    const object = world.objects.objects[ArenaProbe.kind]!.buffer.find((go) => go.arena === arena);

    if (!(object instanceof ArenaProbe)) {
      throw new Error("Expected a collider in the arena");
    }

    object.destroy();
    await world.arenas.unloadArena(arena);

    const snapshot = JSON.parse(JSON.stringify(arena.serialize()));
    await world.arenas.destroyArena(arena);

    const restored = await world.arenas.loadArena(source, snapshot);
    const absentAfterRestore = restored.size === 0;

    await world.arenas.destroyArena(restored);

    const fresh = await world.arenas.loadArena(source);
    const result = {
      saved: snapshot.objects["root:0"],
      absentAfterRestore,
      presentAfterFreshLoad: fresh.size === 1
    };

    destroy();

    return result;
  });

  expect(result).toEqual({
    saved: { destroyed: true },
    absentAfterRestore: true,
    presentAfterFreshLoad: true
  });
});

test("an invalid state part does not partially restore the object", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, ArenaProbe, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const arena = await world.arenas.loadArena(() => ({
      objects: [[ArenaProbe, { bbox: [40, 40, 60, 60] }]]
    }));

    const object = world.objects.objects[ArenaProbe.kind]!.buffer.find((go) => go.arena === arena);

    if (!(object instanceof ArenaProbe)) {
      throw new Error("Expected a collider in the arena");
    }
    const snapshot = object.state.save();
    snapshot["position"] = { x: 100, y: 100 };
    snapshot["motion"] = "unknown";

    let error = "";

    try {
      object.state.restore(snapshot);

    } catch (cause) {
      error = String(cause);
    }

    const result = { error, x: object.x, y: object.y, solid: object.motion.solid };

    destroy();

    return result;
  });

  expect(result.error).toContain('invalid "motion"');
  expect(result).toMatchObject({ x: 40, y: 40, solid: true });
});

async function createScene(page: Page): Promise<JSHandle<fixture.ArenaScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createArenaScene } = await import(url) as typeof fixture;
    return createArenaScene();
  }, "/src/engine/game/tests/arena-fixture.ts");
}
