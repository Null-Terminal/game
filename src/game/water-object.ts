import type { BBoxTuple } from "#engine/rtree";

import { GameObject, StaticInteractObject } from "#engine/game-objects";
import type { DefaultGameObjectOptions, Refs } from "#engine/game-objects";

import { FillerObject } from "#game/filler-object";
import { WallObject } from "#game/wall-object";

type WaterObjectOptions = DefaultGameObjectOptions & { bbox: BBoxTuple };

export class WaterObject extends StaticInteractObject<WaterObjectOptions> {
  static override readonly with = GameObject.refs({
    fill: ({ bbox }: WaterObjectOptions) => {
      const [x1, y1, x2, y2] = bbox;
      const depth = y2 - y1;

      if (Number.isFinite(x1) && Number.isFinite(x2)) {
        return [FillerObject, {
          show: "water",
          overlay: true,
          bbox: [0, 0, x2 - x1, depth]
        }] as const;
      }

      return [FillerObject, {
        show: "water",
        stretch: "w",
        overlay: true,
        bbox: [0, 0, 1, depth]
      }] as const;
    },

    bed: ({ bbox }: WaterObjectOptions) => {
      const [x1, , x2] = bbox;

      if (Number.isFinite(x1) && Number.isFinite(x2)) {
        return [WallObject, { bbox: [0, 0, x2 - x1, 1] }] as const;
      }

      return [WallObject, { bbox: [-Infinity, 0, Infinity, 1] }] as const;
    }
  });

  override refs = {} as Refs<(typeof WaterObject)["with"]>;

  init() {}
}
