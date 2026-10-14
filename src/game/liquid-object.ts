import type { BBoxTuple } from "#engine/rtree";

import { GameObject, StaticInteractObject, ifAlive } from "#engine/game-objects";
import type { DefaultGameObjectOptions, Refs } from "#engine/game-objects";

import { FillerObject } from "#game/filler-object";
import { WallObject } from "#game/wall-object";
import { PersonObject } from "#game/person-object";

type LiquidObjectOptions = DefaultGameObjectOptions & { bbox: BBoxTuple };

export class LiquidObject extends StaticInteractObject<LiquidObjectOptions> {
  static readonly LAVA_DAMAGE_PER_SECOND = 10;

  static override readonly with = GameObject.refs<LiquidObjectOptions>()({
    fill: ({ bbox }) => {
      const [x1, y1, x2, y2] = bbox;
      const originX = Number.isFinite(x1) ? x1 : 0;
      const originY = Number.isFinite(y1) ? y1 : 0;

      return [FillerObject, {
        overlay: true,
        bbox: [x1 - originX, y1 - originY, x2 - originX, y2 - originY]
      }] as const;
    },

    bed: ({ bbox }) => {
      const [x1, y1, x2] = bbox;
      const originX = Number.isFinite(x1) ? x1 : 0;
      const originY = Number.isFinite(y1) ? y1 : 0;

      return [WallObject, {
        bbox: [x1 - originX, y1 - originY, x2 - originX, y1 - originY + 1]
      }] as const;
    }
  });

  override refs = {} as Refs<(typeof LiquidObject)["with"]>;

  init() {}

  @ifAlive
  override visit(go: GameObject) {
    if (!(go instanceof PersonObject)) {
      return;
    }

    if (this.refs.fill?.nowPlaying !== FillerObject.animations.lava) {
      return;
    }

    go.updateState(({ hp }) => ({
      hp: hp - LiquidObject.LAVA_DAMAGE_PER_SECOND * this.canvas.delta
    }));
  }
}
