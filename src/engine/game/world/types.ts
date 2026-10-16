import type { BBoxTuple } from "#engine/rtree/bbox";
import type { CreateOptionsOf, GameObject } from "#engine/game-objects";
import type { KindedGameObjectCtor } from "#engine/game-object-pool";

export type WorldObject<T extends typeof GameObject = typeof GameObject> = [
  GameObject: KindedGameObjectCtor<T>,
  CreateOptionsOf<T>?
];

export type WorldObjects = WorldObject[];

export interface WorldOptions {
  objects: WorldObjects
}

export interface Collision {
  bbox: BBoxTuple;
  object: GameObject;
}
