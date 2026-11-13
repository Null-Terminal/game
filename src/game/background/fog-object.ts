import { cache } from "#decorators/cache";
import { isInRange } from "#/utils/validators";
import { GameObject, type AnimationInstance } from "#engine/game-objects";

import { FogObjectDebug } from "#game/background/fog-object/debug";
import { FogObjectRender } from "#game/background/fog-object/render";
import type { FogAppearanceOptions, FogObjectOptions } from "#game/background/fog-object/types";

export type * from "#game/background/fog-object/types";

export class FogObject extends GameObject<FogObjectOptions> {
  static readonly #haze: FogAppearanceOptions = {
    texture: { density: 12, seed: 0x4e2d9a71 },
    opacity: 0.25,
    speed: 1
  };

  static readonly #dense: FogAppearanceOptions = {
    texture: { density: 36, seed: 0x4e2d9a71 },
    opacity: 0.75,
    speed: 3,
    flow: true,
    sway: 2
  };

  static override readonly animations = {
    fog: (go: GameObject) => FogObject.#createPlayback(go),
    haze: (go: GameObject) => FogObject.#createPlayback(go, FogObject.#haze),
    dense: (go: GameObject) => FogObject.#createPlayback(go, FogObject.#dense)
  };

  override readonly animations = FogObject.animations;

  @cache
  override get debug(): FogObjectDebug {
    return new FogObjectDebug(this);
  }

  @cache
  override get render(): FogObjectRender {
    return new FogObjectRender(this);
  }

  override get redrawEvent() {
    return this.options.overlay ? this.canvas.events.overlay : this.canvas.events.background;
  }

  override get sleepable() {
    return false;
  }

  init() {
    if (!Number.isFinite(this.y) || !Number.isFinite(this.height) || this.height <= 0) {
      throw new RangeError("Fog bbox must have finite vertical bounds and positive height");
    }

    if (this.options.show == null) {
      this.play(this.animations.fog);
    }
  }

  static #createPlayback(go: GameObject, appearance?: FogAppearanceOptions): AnimationInstance {
    if (!(go instanceof FogObject)) {
      throw new TypeError("Fog animation requires a FogObject");
    }

    const { texture, opacity, speed, flow, sway } = appearance ?? go.options;

    if (
      texture == null || opacity == null || speed == null ||
      !isInRange(opacity, 0, 1) ||
      !Number.isFinite(speed) || (sway != null && !Number.isFinite(sway))
    ) {
      throw new RangeError("Fog requires a texture, opacity between 0 and 1, and finite speed and sway");
    }

    const opts: FogAppearanceOptions = { texture, opacity, speed };

    if (flow != null) {
      opts.flow = flow;
    }

    if (sway != null) {
      opts.sway = sway;
    }

    return go.render.createPlayback(opts);
  }
}
