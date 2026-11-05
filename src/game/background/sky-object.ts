import { cache } from "#decorators/cache";
import { isInRange } from "#/utils/validators";
import { GameObject } from "#engine/game-objects";

import { overcastSky, stormSky } from "#game/background/sky-object/presets";
import { SkyObjectRender } from "#game/background/sky-object/render";
import type { SkyOptions, SkySceneOptions } from "#game/background/sky-object/types";

export type * from "#game/background/sky-object/types";
export { duskSky } from "#game/background/sky-object/presets";

export class SkyObject extends GameObject<SkyOptions> {
  static override readonly animations = {
    sky: (object: GameObject) => SkyObject.#createPlayback(object),
    storm: (object: GameObject) => SkyObject.#createPlayback(object, stormSky),
    overcast: (object: GameObject) => SkyObject.#createPlayback(object, overcastSky)
  };

  override readonly animations = SkyObject.animations;

  @cache
  override get render(): SkyObjectRender {
    return new SkyObjectRender(this);
  }

  override get redrawEvent() {
    return this.canvas.events.background;
  }

  init() {
    const scrollFactor = this.options.celestialScrollFactor ?? 0;
    const cloudSpeed = this.options.clouds?.speed;

    if (!isInRange(scrollFactor, 0, 1)) {
      throw new RangeError("Celestial scroll factor must be between 0 and 1");
    }

    if (cloudSpeed != null && !Number.isFinite(cloudSpeed)) {
      throw new RangeError("Cloud speed must be finite");
    }

    this.syncSize();

    if (this.options.show == null) {
      this.play(this.animations.sky);
    }
  }

  syncSize() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  static #createPlayback(object: GameObject, scene?: SkySceneOptions) {
    if (!(object instanceof SkyObject)) {
      throw new TypeError("Sky animation requires a SkyObject");
    }

    return object.render.createPlayback(scene ?? object.options);
  }
}
