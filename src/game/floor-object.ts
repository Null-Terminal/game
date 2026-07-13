import { GameObject } from "#engine/game-objects";
import type { Accept, Visitors } from "#engine/game-objects";

import { WallObject } from "#game/wall-object";
import { FillerObject } from "#game/filler-object";

export class FloorObject extends GameObject {
  static override readonly visitors = {
    wall: [WallObject, { bbox: [-Infinity, 130, Infinity, 135] }],
    filler: [FillerObject, { stretchWidth: true }]
  } satisfies Accept;

  override visitors = {} as Visitors<(typeof FloorObject)["visitors"]>;

  init() {}
}
