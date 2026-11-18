import { expect, test, type JSHandle, type Page } from "@playwright/test";

import type * as fixture from "#engine/game/tests/arena-fixture";

test("destroying a child keeps its slot while the parent survives", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, CompositeProbe, ChildProbe, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const arena = await world.arenas.loadArena(() => ({ objects: [[CompositeProbe, {}]] }));
    const parent = world.objects.objects[CompositeProbe.kind]!.buffer.find((go) => go.arena === arena);

    if (!(parent instanceof CompositeProbe)) {
      throw new Error("Expected a parent in the arena");
    }

    parent.refs["child"]?.destroy();
    await world.arenas.unloadArena(arena);
    await world.arenas.restoreArena(arena);

    const restored = world.objects.objects[CompositeProbe.kind]!.buffer.find((go) => go.arena === arena);
    const result = {
      parentRestored: restored instanceof CompositeProbe,
      childAbsent: world.objects.objects[ChildProbe.kind]?.length === 0,
      childSlot: arena.serialize().objects["root:0/with%3Achild"]
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    parentRestored: true,
    childAbsent: true,
    childSlot: { destroyed: true }
  });
});

test("a destroyed parent does not shift the next root slot", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, CompositeProbe, ChildProbe, ArenaProbe, World, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    const source = () => ({ objects: World.of([
      [CompositeProbe, {}],
      [ArenaProbe, { bbox: [100, 40, 120, 60] }]
    ]) });

    const arena = await world.arenas.loadArena(source);
    const parent = world.objects.objects[CompositeProbe.kind]!.buffer.find((go) => go.arena === arena)!;
    const sibling = world.objects.objects[ArenaProbe.kind]!.buffer.find((go) => go.arena === arena);

    if (!(sibling instanceof ArenaProbe)) {
      throw new Error("Expected a sibling in the arena");
    }

    parent.destroy();
    sibling.motion.toKinematic();
    sibling.move(25, 0);

    await world.arenas.unloadArena(arena);
    await world.arenas.restoreArena(arena);

    const restoredSibling = world.objects.objects[ArenaProbe.kind]!.buffer.find((go) => go.arena === arena);
    const snapshot = arena.serialize();

    const result = {
      parentAbsent: world.objects.objects[CompositeProbe.kind]?.length === 0,
      childAbsent: world.objects.objects[ChildProbe.kind]?.length === 0,
      siblingX: restoredSibling?.x,
      parentSlot: snapshot.objects["root:0"],
      childSlot: snapshot.objects["root:0/with%3Achild"]
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    parentAbsent: true,
    childAbsent: true,
    siblingX: 125,
    parentSlot: { destroyed: true },
    childSlot: { destroyed: true }
  });
});

test("explicit keys keep state attached when source entries change order", async ({ page }) => {
  const scene = await createScene(page);

  const result = await scene.evaluate(async ({ game, ArenaProbe, World, createWorld, destroy }) => {
    const world = await game.loadLevel(async () => createWorld());
    let reversed = false;

    const source = () => ({
      objects: reversed ? World.of([
        [ArenaProbe, { stateKey: "right", bbox: [50, 40, 70, 60] }],
        [ArenaProbe, { stateKey: "left/door", bbox: [10, 40, 30, 60] }]
      ]) : World.of([
        [ArenaProbe, { stateKey: "left/door", bbox: [10, 40, 30, 60] }],
        [ArenaProbe, { stateKey: "right", bbox: [50, 40, 70, 60] }]
      ])
    });

    const arena = await world.arenas.loadArena(source);
    const objects = world.objects.objects[ArenaProbe.kind]!.buffer.filter((go) => go.arena === arena);

    for (const go of objects) {
      if (!(go instanceof ArenaProbe)) {
        throw new Error("Expected a collider in the arena");
      }

      go.motion.toKinematic();
      go.move(go.options.stateKey === "left/door" ? 20 : 40, 0);
    }

    await world.arenas.unloadArena(arena);
    reversed = true;
    await world.arenas.restoreArena(arena);

    const restored = world.objects.objects[ArenaProbe.kind]!.buffer.filter((go) => go.arena === arena);
    const left = restored.find((go) => go.options.stateKey === "left/door");
    const right = restored.find((go) => go.options.stateKey === "right");

    const result = {
      leftX: left?.x,
      rightX: right?.x,
      keys: Object.keys(arena.serialize().objects).sort()
    };

    destroy();
    return result;
  });

  expect(result).toEqual({
    leftX: 30,
    rightX: 90,
    keys: ["key:left/door", "key:right"]
  });
});

async function createScene(page: Page): Promise<JSHandle<fixture.ArenaScene>> {
  await page.goto("/tests/fixture.html");

  return page.evaluateHandle(async (url) => {
    const { createArenaScene } = await import(url) as typeof fixture;
    return createArenaScene();
  }, "/src/engine/game/tests/arena-fixture.ts");
}
