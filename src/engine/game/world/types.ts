import type { BBoxTuple } from "#engine/rtree/bbox";
import type { GameObject } from "#engine/game-objects";
import type { ConcreteGameObjectConstructor  } from "#engine/game-object-pool";

export type WorldObject<T extends typeof GameObject = typeof GameObject> = [
  GameObject: ConcreteGameObjectConstructor<T>,
  ConstructorParameters<T>[2]?
];

export type WorldObjects = WorldObject[];

export interface WorldOptions {
  objects: WorldObjects
}

export interface Collision {
  bbox: BBoxTuple;
  object: GameObject;
}
