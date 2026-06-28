import type { GameObject } from "#engine/game-objects";

export type PoolPointer = [kind: number, index: number];

export interface GameObjectStore {
  length: number;
  buffer: GameObject[]
}

export type ConcreteGameObjectConstructor<T extends typeof GameObject> = {
  new (...args: any[]): InstanceType<T>;
  get kind(): number;
};
