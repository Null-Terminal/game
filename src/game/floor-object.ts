import { GameObject } from "#engine/game-objects";
import type { Accept, Refs } from "#engine/game-objects";

import { WallObject } from "#game/wall-object";
import { FillerObject } from "#game/filler-object";

export class FloorObject extends GameObject {
  static override readonly with = {
    wall: [WallObject, { bbox: [-Infinity, 130, Infinity, 135] }],
    filler: [FillerObject, { stretchWidth: true }]
  } satisfies Accept;

  override refs = {} as Refs<(typeof FloorObject)["with"]>;

  init() {}
}
