import type { Handlers } from "#/event-emitter";

import type { BBoxTuple } from "#engine/rtree";
import type { WorldObject } from "#engine/game";
import type { LoadedAnimation, FrameEffects } from "#engine/animation-loader";
import type { MovePath, MoveAlongPathOptions } from "#engine/game-objects/movement/types";

export type Animations = Record<string, LoadedAnimation>;
export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<string> };

export type Composition = Record<string, WorldObject>;
export type CompositionInstances<T extends Record<string, WorldObject>> = {
  [K in keyof T]: InstanceType<T[K][0]>;
};

export interface Effects extends FrameEffects {
  speed?: number;
}

export interface DefaultGameObjectOptions {
  show?: string;
  movement?: { path: MovePath } & MoveAlongPathOptions;

  stretchWidth?: boolean;
  stretchHeight?: boolean;
  staticScreen?: boolean;

  effects?: Effects;
}

export type GameObjectOptions =
  { x?: number; y?: number } & DefaultGameObjectOptions |
  { bbox?: BBoxTuple } & DefaultGameObjectOptions;
