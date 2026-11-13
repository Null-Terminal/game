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

export class RevivingProbe extends Probe {
  #revived = false;

  override destroy() {
    if (this.destroyed) {
      return;
    }

    const revive = !this.#revived;
    this.#revived = true;

    super.destroy();

    if (revive) {
      this.game.world.objects.add(RevivingProbe, this.game, {});
    }
  }
}

export async function createLifecycleScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 100, height: 100, backend: "2d" });
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
    createProbe(opts: Parameters<Probe["create"]>[2] = {}) {
      const pointer = pool.add(Probe, game, opts);
      return { pointer, object: getObject(pointer, Probe) };
    },
    createAnimatedProbe() {
      const pointer = pool.add(AnimatedProbe, game, {});
      return { pointer, object: getObject(pointer, AnimatedProbe) };
    },
    createFailingProbe() {
      return pool.add(FailingProbe, game, {});
    },
    createRevivingProbe() {
      const pointer = pool.add(RevivingProbe, game, {});
      return { pointer, object: getObject(pointer, RevivingProbe) };
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
