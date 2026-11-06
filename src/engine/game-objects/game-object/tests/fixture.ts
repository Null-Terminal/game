import { Camera, Game, RenderCanvas, World } from "#engine/game";
import { GameObject } from "#engine/game-objects/game-object";
import type { PoolPointer } from "#engine/game-object-pool";

export class Probe extends GameObject {
  override init() {}

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

export class AnimatedProbe extends Probe {
  static override readonly animations = { test: () => ({ draw() {} }) };
  override readonly animations = AnimatedProbe.animations;
}

export class FailingProbe extends Probe {
  override create(...args: Parameters<Probe["create"]>): ReturnType<Probe["create"]> {
    super.create(...args);
    throw new Error("late failure");
  }
}

export async function createLifecycleScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 100, height: 100 });
  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({ objects: World.of([]) }));
  const pool = world.objects;

  function getObject<T extends GameObject>(pointer: PoolPointer, ctor: new () => T): T {
    const object = pool.get(...pointer);

    if (!(object instanceof ctor)) {
      throw new Error(`Expected ${ctor.name} in the object pool`);
    }

    return object;
  }

  return {
    game,
    pool,
    canvas,
    createProbe(options: Parameters<Probe["create"]>[2] = {}) {
      const pointer = pool.add(Probe, game, options);
      return { pointer, object: getObject(pointer, Probe) };
    },
    createAnimatedProbe() {
      const pointer = pool.add(AnimatedProbe, game, {});
      return { pointer, object: getObject(pointer, AnimatedProbe) };
    },
    createFailingProbe() {
      return pool.add(FailingProbe, game, {});
    },
    tick(delta: number, now: number) {
      const ctx = element.getContext("2d")!;
      canvas.emitter.emit(canvas.events.beforeRender, { ctx, delta, now });
    },
    destroy() {
      game.destroy();
    }
  };
}

export type LifecycleScene = Awaited<ReturnType<typeof createLifecycleScene>>;
