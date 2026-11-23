import { AnimationDefinition } from "#/animation-definition";
import { getAudioContext, type LoadedSound } from "#/audio";

import { LoadedAnimation } from "#engine/animation";
import { Camera, Game, RenderCanvas, World } from "#engine/game";

import type { PoolPointer } from "#engine/game-object-pool";
import { GameObject } from "#engine/game-objects";

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

export class FailingSoundProbe extends Probe {
  static animation: LoadedAnimation<{ default: LoadedSound }> | null = null;

  override init() {
    const animation = FailingSoundProbe.animation;

    if (animation == null) {
      throw new Error("Missing test sound");
    }

    this.sound.play(animation.sounds.default);
    throw new Error("Sound probe initialization failed");
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
      this.world.objects.add(RevivingProbe, this.game, {});
    }
  }
}

export async function createLifecycleScene() {
  const element = document.getElementById("game") as HTMLCanvasElement;
  const canvas = new RenderCanvas(element, { width: 100, height: 100, backend: "2d" });
  canvas.stop();

  const game = Game.camera(new Camera()).create(canvas);
  const world = await game.loadLevel(async () => new World({ persistentObjects: World.of([]) }));
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
    getAudioContext,
    createSoundAnimation(buffer: AudioBuffer) {
      const animation = new AnimationDefinition({
        sprites: [{ x: 0, y: 0, width: 1, height: 1, duration: 100, spriteId: "" }]
      });

      return new LoadedAnimation<{ default: LoadedSound }>(
        {} as ImageBitmap,
        animation,
        { default: { buffer, loop: true, volume: 0.4 } }
      );
    },

    createSilentAnimation() {
      return new LoadedAnimation({} as ImageBitmap, new AnimationDefinition({
        sprites: [{ x: 0, y: 0, width: 1, height: 1, duration: 100, spriteId: "" }]
      }));
    },
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

    createFailingSoundProbe(animation: LoadedAnimation<{ default: LoadedSound }>) {
      FailingSoundProbe.animation = animation;
      return pool.add(FailingSoundProbe, game, {});
    },

    createRevivingProbe() {
      const pointer = pool.add(RevivingProbe, game, {});

      return { pointer, object: getObject(pointer, RevivingProbe) };
    },

    tick(delta: number, now: number) {
      const ctx = element.getContext("2d")!;
      canvas.events.beforeRender.emit({ ctx, delta, now });
    },

    destroy() {
      game.destroy();
    }
  };
}

export type LifecycleScene = Awaited<ReturnType<typeof createLifecycleScene>>;
