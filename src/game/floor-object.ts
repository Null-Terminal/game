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
      const originX = Number.isFinite(x1) ? x1 : 0;
      const originY = Number.isFinite(y1) ? y1 : 0;
      const finiteY = Number.isFinite(y1) && Number.isFinite(y2);

      // Оба края по X бесконечны, а по Y плита конечная — тайлим ширину, спрайт висит от верха.
      if (!Number.isFinite(x1) && !Number.isFinite(x2) && finiteY) {
        return [FillerObject, { stretch: "w", y: y2 - originY - height }] as const;
      }

      const top = finiteY ? y2 - originY - height : y1 - originY;
      const bottom = finiteY ? top + height : y2 - originY;

      return [FillerObject, {
        bbox: [x1 - originX, top, x2 - originX, bottom]
      }] as const;

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
      const originX = Number.isFinite(x1) ? x1 : 0;
      const originY = Number.isFinite(y1) ? y1 : 0;

      return [WallObject, {
        bbox: [x1 - originX, y1 - originY, x2 - originX, y2 - originY]
      }] as const;
    }
  });

  override refs = {} as Refs<(typeof FloorObject)["with"]>;

  init() {}
}
