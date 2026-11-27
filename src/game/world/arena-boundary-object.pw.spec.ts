import { expect, test } from "@playwright/test";

import type { World as GameWorld } from "#engine/game";
import { createInteractionScene } from "#game/tests/browser";

test("a transition loads on either side without duplicate requests", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, PersonObject, ArenaBoundaryObject, destroy }) => {
    let loads = 0;
    let targetLoaded = false;

    const arenas = Arenas.declare({ start: () => ({
        objects: [[ArenaBoundaryObject, {
          bbox: [0, 0, 200, 200],
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

test("a horizontal transition responds from either side", async ({ page }) => {
  const scene = await createInteractionScene(page);

  const result = await scene.evaluate(async ({ game, World, Arenas, PersonObject, ArenaBoundaryObject, destroy }) => {
    let loads = 0;
    let targetLoaded = false;

    const arenas = Arenas.declare({ start: () => ({
        objects: [[ArenaBoundaryObject, {
          bbox: [0, 0, 200, 200],
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

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const fromRight = loads;

    targetLoaded = false;
    player.x = 20;
    boundary.visit(player);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const fromLeft = loads;
    destroy();

    return { before, fromRight, fromLeft };
  });

  expect(result).toEqual({ before: 0, fromRight: 1, fromLeft: 2 });
});
