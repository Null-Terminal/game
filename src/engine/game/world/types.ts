import type { BBoxTuple } from "#engine/rtree/bbox";
import type { CreateOptionsOf, GameObject } from "#engine/game-objects";
import type { KindedGameObjectCtor } from "#engine/game-object-pool";
import type { ArenasDeclaration } from "#engine/game/arena";

export type WorldObject<T extends typeof GameObject = typeof GameObject> = [
  GameObject: KindedGameObjectCtor<T>,
  CreateOptionsOf<T>?
];

export type WorldObjects = WorldObject[];

export interface WorldOptions {
  // Объекты мира, не принадлежащие аренам
  persistentObjects: WorldObjects;

  // Объявленные арены и правила их предзагрузки
  arenas?: ArenasDeclaration;
}

export interface Collision {
  bbox: BBoxTuple;
  object: GameObject;
}

export type CollisionScore = (bbox: BBoxTuple, object: GameObject) => number;
