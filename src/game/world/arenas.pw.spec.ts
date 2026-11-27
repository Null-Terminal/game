import { expect, test } from "@playwright/test";

import type * as ShaftModule from "#game/sprites/platforms/elevator/shaft";

import type * as GameModule from "#engine/game";

import type * as WorldModule from "#game/world";
import type * as PersonModule from "#game/characters/person-object";
import type * as BoundaryModule from "#game/world/arena-boundary-object";

test("the demo loads its street and permanent background arenas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/game.html?renderer=2d");
  await expect(page.locator("#loading")).toBeHidden({ timeout: 30_000 });

  expect(errors).toEqual([]);
});

test("scaffold transition loads the upper arena after the street unloads", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const result = await page.evaluate(async ({ gameUrl, worldUrl, personUrl, boundaryUrl }) => {
    const [{ Camera, Game, RenderCanvas, World }, { createDemoArenas }, { PersonObject }, { ArenaBoundaryObject }] = await Promise.all([
      import(gameUrl) as Promise<typeof GameModule>,
      import(worldUrl) as Promise<typeof WorldModule>,
      import(personUrl) as Promise<typeof PersonModule>,
      import(boundaryUrl) as Promise<typeof BoundaryModule>
    ]);

    const canvas = new RenderCanvas(document.getElementById("game") as HTMLCanvasElement, {
      width: 900, height: 650, backend: "2d"
    });

    const game = Game.camera(new Camera()).create(canvas);

    try {
      const declaration = createDemoArenas();
      const world = await game.loadLevel(async () => new World({
        persistentObjects: [[PersonObject, { x: 3000, y: 2500 }]],
        arenas: declaration
      }));

      canvas.stop();

      const player = world.objects.get(PersonObject.kind, 0)!;
      const street = world.arenas.getByRef(declaration.refs.street)!;
      const transitions = world.arenas.getByRef(declaration.refs.transitions)!;

      await world.arenas.unloadArena(street);
      game.settings.set("sleep", { distanceScreens: 1 });
      game.sleep.update();

      const boundary = world.findInteractCollisions(
        player.x, player.y, player.x + player.width, player.y + player.height
      ).map(({ object }) => object).find((object) => object instanceof ArenaBoundaryObject) as InstanceType<typeof ArenaBoundaryObject> | undefined;

      boundary?.visit(player);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      return {
        streetLoaded: street.loaded,
        transitionsLoaded: transitions.loaded,
        boundaryFound: boundary != null,
        boundarySleeping: boundary?.status.sleeping,
        upperLoaded: world.arenas.getByRef(declaration.refs.upper)?.loaded === true
      };

    } finally {
      game.destroy();
    }
  }, {
    gameUrl: "/src/engine/game.ts",
    worldUrl: "/src/game/world.ts",
    personUrl: "/src/game/characters/person-object.ts",
    boundaryUrl: "/src/game/world/arena-boundary-object.ts"
  });

  expect(result).toEqual({
    streetLoaded: false,
    transitionsLoaded: true,
    boundaryFound: true,
    boundarySleeping: false,
    upperLoaded: true
  });
});

test("the shaft remains visible above the elevator after the background arena loads", async ({ page }) => {
  await page.goto("/tests/fixture.html");

  const { visible, hidden } = await page.evaluate(async ({ gameUrl, worldUrl, shaftUrl }) => {
    const [{ Camera, Game, RenderCanvas, World }, { createDemoArenas }, { elevatorShaft }] = await Promise.all([
      import(gameUrl) as Promise<typeof GameModule>,
      import(worldUrl) as Promise<typeof WorldModule>,
      import(shaftUrl) as Promise<typeof ShaftModule>
    ]);

    const element = document.getElementById("game") as HTMLCanvasElement;
    const canvas = new RenderCanvas(element, { width: 900, height: 650, backend: "2d", backgroundColor: "#080E1F" });
    const game = Game.camera(new Camera()).create(canvas);
    const world = await game.loadLevel(async () => new World({
      persistentObjects: [],
      arenas: createDemoArenas()
    }));

    canvas.stop();
    game.camera.x = 2700;
    game.camera.y = 900;

    const shaft = Object.values(world.objects.objects)
      .flatMap((store) => store.buffer.slice(0, store.length))
      .find((object) => object.options.show === elevatorShaft);

    if (shaft == null) {
      throw new Error("Elevator shaft was not created");
    }

    const ctx = element.getContext("2d")!;
    const pixel = () => Array.from(ctx.getImageData(200, 200, 1, 1).data);
    const render = () => {
      canvas.clear();
      canvas.events.background.emit({ ctx, delta: 0.016, now: 16 });
    };

    render();
    const visible = pixel();

    shaft.status.sleep();
    render();
    const hidden = pixel();

    game.destroy();

    return { visible, hidden };
  }, {
    gameUrl: "/src/engine/game.ts",
    worldUrl: "/src/game/world.ts",
    shaftUrl: "/src/game/sprites/platforms/elevator/shaft.ts"
  });

  expect(visible).not.toEqual(hidden);
});
