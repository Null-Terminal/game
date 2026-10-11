import type { BBoxTuple } from "#engine/rtree";

import { GameObject } from "#engine/game-objects";
import type { DefaultGameObjectOptions, Refs } from "#engine/game-objects";

import { WallObject } from "#game/wall-object";
import { FillerObject } from "#game/filler-object";

type FloorObjectOptions = DefaultGameObjectOptions & { bbox: BBoxTuple };

export class FloorObject extends GameObject<FloorObjectOptions> {
  static override readonly with = GameObject.refs({
    fill: ({ show, bbox }: FloorObjectOptions) => {
      const [x1, y1, x2, y2] = bbox;

      const height = fillHeight(show);
      const originY = Number.isFinite(y1) ? y1 : 0;
      const y = y2 - originY - height;

      if (Number.isFinite(x1) && Number.isFinite(x2)) {
        return [FillerObject, { bbox: [0, y, x2 - x1, y + height] }] as const;
      }

      return [FillerObject, { stretch: "w", y }] as const;

      function fillHeight(show: string | undefined): number {
        const animations = FillerObject.animations;

        if (show != null && show in animations) {
          return animations[show as keyof typeof animations].maxHeight;
        }

        return 0;
      }
    },

    bed: ({ bbox }: FloorObjectOptions) => {
      const [x1, y1, x2, y2] = bbox;
      const height = y2 - y1;

      if (Number.isFinite(x1) && Number.isFinite(x2)) {
        return [WallObject, { bbox: [0, 0, x2 - x1, height] }] as const;
      }

      return [WallObject, { bbox: [-Infinity, 0, Infinity, height] }] as const;
    }
  });

  override refs = {} as Refs<(typeof FloorObject)["with"]>;

  init() {}
}
