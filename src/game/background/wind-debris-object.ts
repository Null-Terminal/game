import { cache } from "#decorators/cache";

import type { AnimationInstance } from "#engine/game-objects";
import { GameObject } from "#engine/game-objects";

import { roadDebris, stormDebris } from "#game/background/wind-debris-object/presets";
import { WindDebrisObjectDebug } from "#game/background/wind-debris-object/debug";
import { WindDebrisRender } from "#game/background/wind-debris-object/render";

import type { WindDebrisOptions, WindDebrisSceneOptions } from "#game/background/wind-debris-object/types";

export type {
  NewspaperOptions,
  TumbleweedOptions,
  WindDebrisOptions,
  WindDebrisSceneOptions,
  WindOptions,
  WindParticleMotionOptions,
  WindParticleOptions,
  WindRange
} from "#game/background/wind-debris-object/types";

export { roadDebris, stormDebris } from "#game/background/wind-debris-object/presets";

export class WindDebrisObject extends GameObject<WindDebrisOptions> {
  static override readonly animations = {
    wind: (go: GameObject) => WindDebrisObject.#createPlayback(go),
    road: (go: GameObject) => WindDebrisObject.#createPlayback(go, roadDebris),
    storm: (go: GameObject) => WindDebrisObject.#createPlayback(go, stormDebris)
  };

  override readonly animations = WindDebrisObject.animations;

  @cache
  override get debug(): WindDebrisObjectDebug {
    return new WindDebrisObjectDebug(this);
  }

  @cache
  override get render(): WindDebrisRender {
    return new WindDebrisRender(this);
  }

  override get redrawEvent() {
    return this.canvas.events.background;
  }

  override get sleepable() {
    return false;
  }

  init() {
    if (this.options.show == null) {
      this.play(this.animations.wind);
    }
  }

  static #createPlayback(go: GameObject, preset?: WindDebrisSceneOptions): AnimationInstance {
    if (!(go instanceof WindDebrisObject)) {
      throw new TypeError("Wind animation requires a WindDebrisObject");
    }

    const { seed, wind, motion, particles } = preset ?? go.options;

    if (
      seed == null || !Number.isFinite(seed) ||
      wind == null || motion == null || particles == null ||
      Object.values(particles).some((options) =>
        options != null && (!Number.isInteger(options.count) || options.count < 0 || options.count > 100)
      )
    ) {
      throw new RangeError("Wind debris requires a scene with a finite seed and particle counts from 0 to 100");
    }

    return go.render.createPlayback({ seed, wind, motion, particles });
  }
}
