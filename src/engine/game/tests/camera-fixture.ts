import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { PhysicsObject } from "#engine/game-objects";

class CameraTarget extends PhysicsObject {
  override init() {
    this.width = 10;
    this.height = 10;
  }
}

export async function createCameraScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 200, height: 100, backend: "2d" });
  const camera = new Camera({
    smoothness: 1,
    deadZone: { left: 25, right: 25, top: 20, bottom: 20 }
  });
  const game = Game.camera(camera).create(canvas);
  const world = await game.loadLevel(async () => new World({ objects: [] }));

  canvas.stop();

  const target = world.objects.get(...world.createObject(CameraTarget, { x: 175, y: 85 }));

  if (!(target instanceof CameraTarget)) {
    throw new Error("Camera target was not created");
  }

  const unbind = camera.bindTo(target);

  return {
    camera,
    canvas,
    destroy: () => {
      unbind();
      game.destroy();
    }
  };
}
