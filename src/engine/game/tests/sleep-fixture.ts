import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { BackgroundObject, ColliderObject } from "#engine/game-objects";

class Probe extends ColliderObject {
  renderTicks = 0;

  override init() {
    this.motion.toKinematic();
    this.play(() => ({ draw: () => this.renderTicks++ }));
  }
}

export async function createSleepScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 100, height: 100, backend: "2d" });
  const game = Game.camera(new Camera()).create(canvas, {
    sleep: { distanceScreens: 2, wakeDistanceScreens: 1, checkIntervalSeconds: 0.1 }
  });

  const world = await game.loadLevel(async () => new World({ objects: [] }));
  canvas.stop();

  const insert = world.statics.insert.bind(world.statics);
  let initialStaticInsertions = 0;

  world.statics.insert = (...args) => {
    initialStaticInsertions++;
    return insert(...args);
  };

  const probe = world.objects.get(...world.createObject(Probe, {
    bbox: [350, 0, 360, 10],
    movement: { path: [[390, 0]], speed: 20 }
  })) as Probe;

  world.statics.insert = insert;

  return {
    game,
    canvas,
    world,
    probe,
    initialStaticInsertions,
    createBackground: (options: Parameters<BackgroundObject["create"]>[2]) => {
      const background = world.objects.get(...world.createObject(BackgroundObject, options));

      if (!(background instanceof BackgroundObject)) {
        throw new Error("Sleep fixture: background was not created");
      }

      return background;
    },
    destroy: () => {
      game.destroy();
    }
  };
}
