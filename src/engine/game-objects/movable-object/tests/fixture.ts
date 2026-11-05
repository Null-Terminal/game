import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { MovableObject } from "#engine/game-objects/movable-object";
import { StaticObject } from "#engine/game-objects/static-object";
import type { BBoxTuple } from "#engine/rtree";

class Probe extends MovableObject {
  override init() {
    this.width = 1;
    this.height = 1;
  }
}

class FractionalProbe extends MovableObject {
  override init() {
    this.width = 0.2;
    this.height = 1;
  }
}

class Obstacle extends StaticObject {
  visits = 0;

  override visit() {
    this.visits++;
  }
}

export async function createMovementScene(bounds: readonly BBoxTuple[]) {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 100, height: 100 });
  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({ objects: World.of([]) }));
  const obstacles = bounds.map((bbox) => {
    const pointer = world.createObject(Obstacle, { bbox });
    const object = world.objects.get(...pointer);

    if (!(object instanceof Obstacle)) {
      throw new Error("Expected an obstacle in the object pool");
    }

    return object;
  });

  return {
    obstacles,
    createProbe(options: Parameters<Probe["create"]>[2] = {}) {
      const pointer = world.createObject(Probe, options);
      const object = world.objects.get(...pointer);

      if (!(object instanceof Probe)) {
        throw new Error("Expected a movable probe in the object pool");
      }

      return object;
    },

    createFractionalProbe() {
      const pointer = world.createObject(FractionalProbe, {});
      const object = world.objects.get(...pointer);

      if (!(object instanceof FractionalProbe)) {
        throw new Error("Expected a fractional probe in the object pool");
      }

      return object;
    },

    destroy() {
      game.destroy();
    }
  };
}

export type MovementScene = Awaited<ReturnType<typeof createMovementScene>>;
