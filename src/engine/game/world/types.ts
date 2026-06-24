import type { BBoxTuple } from "#engine/rtree/bbox";
import type { GameObject, GameObjectOptions } from "#engine/game-object";
import type { ConcreteGameObjectConstructor  } from "#engine/game-object-pool";

export type WorldObject = [GameObject: ConcreteGameObjectConstructor<typeof GameObject>, GameObjectOptions?];

export type WorldObjects = WorldObject[];

export interface WorldOptions {
  staticWorld: WorldObjects
}

export interface Collision {
  bbox: BBoxTuple;
  object: GameObject;
}
