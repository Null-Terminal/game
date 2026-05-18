import type { GameObject } from "#engine/game-object";

export type PoolPointer = [kind: number, index: number];

export interface GameObjectStore {
  length: number;
  buffer: GameObject[]
}
