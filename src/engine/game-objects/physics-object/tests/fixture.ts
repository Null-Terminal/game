import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { PhysicsObject } from "#engine/game-objects/physics-object";
import { ColliderObject } from "#engine/game-objects/collider-object";
import type { BBoxTuple } from "#engine/rtree";

class Probe extends PhysicsObject {
  override init() {
    this.width = 1;
    this.height = 1;
  }
}

class FractionalProbe extends PhysicsObject {
  override init() {
    this.width = 0.2;
    this.height = 1;
  }
}

class TallProbe extends PhysicsObject {
  override init() {
    this.width = 1;
    this.height = 10;
  }
}

class Obstacle extends ColliderObject {
  visits = 0;

  override visit() {
    this.visits++;
  }
}

export async function createMovementScene(bounds: readonly BBoxTuple[]) {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 100, height: 100, backend: "2d" });
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

    createTallProbe(options: Parameters<TallProbe["create"]>[2] = {}) {
      const pointer = world.createObject(TallProbe, options);
      const object = world.objects.get(...pointer);

      if (!(object instanceof TallProbe)) {
        throw new Error("Expected a tall probe in the object pool");
      }

      return object;
    },

    destroy() {
      game.destroy();
    }
  };
}

export type MovementScene = Awaited<ReturnType<typeof createMovementScene>>;
