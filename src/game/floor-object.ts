import { GameObject } from "#engine/game-objects";
import type { Composition, CompositionInstances } from "#engine/game-objects";

import { WallObject } from "#game/wall-object";
import { FillerObject } from "#game/filler-object";

export class FloorObject extends GameObject {
  static override readonly composition = {
    wall: [WallObject, { bbox: [-Infinity, 130, Infinity, 135] }],
    filler: [FillerObject, { stretchWidth: true }]
  } satisfies Composition;

  override composition = {} as CompositionInstances<(typeof FloorObject)["composition"]>;

  init() {}
}
