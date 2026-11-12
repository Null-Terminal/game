import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { PhysicsObject } from "#engine/game-objects/physics-object";

import { PlatformObject } from "#game/platforms/platform-object";

class Probe extends PhysicsObject {
  override init() {
    this.width = 1;
    this.height = 1;
  }
}

export async function createStaticPlatformScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 100, height: 100, backend: "2d" });
  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({ objects: [] }));

  const platformPointer = world.createObject(PlatformObject, { bbox: [5, 0, 10, 1] });
  const playerPointer = world.createObject(Probe, { x: 4, y: 0 });

  const platform = world.objects.get(...platformPointer);
  const player = world.objects.get(...playerPointer);

  if (!(platform instanceof PlatformObject) || !(player instanceof Probe)) {
    throw new Error("Static platform fixture: objects were not created");
  }

  return { game, world, platform, player, destroy: () => game.destroy() };
}

export type StaticPlatformScene = Awaited<ReturnType<typeof createStaticPlatformScene>>;
