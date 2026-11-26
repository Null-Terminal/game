import { scaffoldPlank } from "#game/sprites/platforms/scaffold-plank";

import { Camera, Game, GameSettings, RenderCanvas, World } from "#engine/game";

import { GameInput } from "#game/input";
import { PersonObject } from "#game/characters/person-object";
import { defaultProjectSettings } from "#game/settings";
import { FallingPlatformObject } from "#game/platforms/falling-platform-object";
import { PlatformObject } from "#game/platforms/platform-object";

export async function createFallingPlatformScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 900, height: 500, backend: "2d" });
  canvas.stop();

  const game = Game.camera(new Camera()).settings(new GameSettings(defaultProjectSettings))
    .input((game) => new GameInput(game)).create(canvas);
  const world = await game.loadLevel(async () => new World({ persistentObjects: [] }));

  const leftPointer = world.createObject(PlatformObject, { show: scaffoldPlank.intact, x: 0, y: 200 });
  const fallingOptions = {
    show: scaffoldPlank.intact,
    showBroken: scaffoldPlank.broken,
    fallAfterSeconds: 0,
    x: 250,
    y: 200
  };

  const middlePointer = world.createObject(FallingPlatformObject, fallingOptions);
  const rightPointer = world.createObject(PlatformObject, { show: scaffoldPlank.intact, x: 500, y: 200 });
  const playerPointer = world.createObject(PersonObject, { x: 250, y: 240 });

  const left = world.objects.get(...leftPointer);
  const middle = world.objects.get(...middlePointer);
  const right = world.objects.get(...rightPointer);
  const player = world.objects.get(...playerPointer);

  if (!(left instanceof PlatformObject) || !(middle instanceof FallingPlatformObject) ||
    !(right instanceof PlatformObject) || !(player instanceof PersonObject)) {
    throw new Error("Falling platform fixture: objects were not created");
  }

  return {
    game,
    world,
    left,
    middle,
    right,
    player,
    destroy: () => game.destroy()
  };
}

export type FallingPlatformScene = Awaited<ReturnType<typeof createFallingPlatformScene>>;
