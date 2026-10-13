import type { BBoxTuple } from "#engine/rtree";

import { GameObject, StaticInteractObject } from "#engine/game-objects";
import type { DefaultGameObjectOptions, Refs } from "#engine/game-objects";

import { FillerObject } from "#game/filler-object";
import { WallObject } from "#game/wall-object";

type WaterObjectOptions = DefaultGameObjectOptions & { bbox: BBoxTuple };

export class WaterObject extends StaticInteractObject<WaterObjectOptions> {
  static override readonly with = GameObject.refs<WaterObjectOptions>()({
    fill: ({ bbox }) => {
      const [x1, y1, x2, y2] = bbox;
      const originX = Number.isFinite(x1) ? x1 : 0;
      const originY = Number.isFinite(y1) ? y1 : 0;

      return [FillerObject, {
        show: "water",
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

  override refs = {} as Refs<(typeof WaterObject)["with"]>;

  init() {}
}
