import { expect, test } from "@playwright/test";

import type { World as GameWorld } from "#engine/game";
import { createInteractionScene } from "#game/tests/browser";

test("crossing a boundary loads the next arena once", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, PersonObject, ArenaBoundaryObject, destroy }) => {
    let loads = 0;
    let targetLoaded = false;

    const arenas = Arenas.declare({ start: () => ({
        objects: [[ArenaBoundaryObject, {
          bbox: [0, 0, 200, 200],
          axis: "y",
          threshold: 100,
          direction: "increasing",
          isLoaded: () => targetLoaded,
          load: async (world: GameWorld) => {
            loads++;
            await world.arenas.loadArena(() => ({ objects: [] }));
            targetLoaded = true;
          }
        }]]
      }) });

    arenas.preload(arenas.refs.start);
    const world = await game.loadLevel(async () => new World({
      persistentObjects: [[PersonObject, { x: 50, y: 0 }]],
      arenas
    }));

    game.canvas.stop();

    const player = world.objects.get(PersonObject.kind, 0)!;
    const boundary = world.objects.get(ArenaBoundaryObject.kind, 0)!;

    boundary.visit(player);
    const before = loads;

    player.y = 120;
    const collisionVisible = world.findInteractCollisions(
      player.x, player.y, player.x + player.width, player.y + player.height
    ).some(({ object }) => object === boundary);

    boundary.visit(player);
    boundary.visit(player);

    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const afterCrossing = { loads, arenas: world.arenas.size };

    boundary.visit(player);
    const afterRepeatedVisit = loads;

    targetLoaded = false;
    player.y = 0;
    boundary.visit(player);
    player.y = 120;
    boundary.visit(player);

    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const afterReturn = loads;
    destroy();

    return { before, collisionVisible, afterCrossing, afterRepeatedVisit, afterReturn };
  });

  expect(result).toEqual({
    before: 0,
    collisionVisible: true,
    afterCrossing: { loads: 1, arenas: 2 },
    afterRepeatedVisit: 1,
    afterReturn: 2
  });
});

test("approaching the lift horizontally can load the previous arena", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, PersonObject, ArenaBoundaryObject, destroy }) => {
    let loads = 0;
    let targetLoaded = false;

    const arenas = Arenas.declare({ start: () => ({
        objects: [[ArenaBoundaryObject, {
          bbox: [0, 0, 200, 200],
          axis: "x",
          threshold: 100,
          direction: "decreasing",
          isLoaded: () => targetLoaded,
          load: async () => {
            loads++;
            targetLoaded = true;
          }
        }]]
      }) });

    arenas.preload(arenas.refs.start);
    const world = await game.loadLevel(async () => new World({
      persistentObjects: [[PersonObject, { x: 150, y: 50 }]],
      arenas
    }));

    const player = world.objects.get(PersonObject.kind, 0)!;
    const boundary = world.objects.get(ArenaBoundaryObject.kind, 0)!;

    boundary.visit(player);
    const before = loads;

    player.x = 20;
    boundary.visit(player);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const after = loads;
    destroy();

    return { before, after };
  });

  expect(result).toEqual({ before: 0, after: 1 });
});
