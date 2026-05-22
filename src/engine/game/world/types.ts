import type { BBoxTuple } from "#engine/rtree/bbox";
import type { GameObject, GameObjectOptions } from "#engine/game-object";
import type { ConcreteGameObjectConstructor  } from "#engine/game-object-pool";

export type WorldObjects = {
  object: [GameObject: ConcreteGameObjectConstructor<typeof GameObject>, GameObjectOptions];
  bbox: BBoxTuple;
}[];

export interface WorldOptions {
  staticWorld: WorldObjects
}
