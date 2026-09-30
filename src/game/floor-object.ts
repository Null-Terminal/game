import { GameObject } from "#engine/game-objects";
import type { Refs } from "#engine/game-objects";

import { WallObject } from "#game/wall-object";
import { FillerObject } from "#game/filler-object";

export class FloorObject extends GameObject {
  static override readonly with = GameObject.refs({
    wall: [WallObject, { bbox: [-Infinity, 130, Infinity, 135] }],
    filler: [FillerObject, { stretch: "w" }]
  });

  override refs = {} as Refs<(typeof FloorObject)["with"]>;

  init() {}
}
