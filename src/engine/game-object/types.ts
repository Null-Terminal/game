import type { Handlers } from "#/event-emitter";

import type { BBoxTuple } from "#engine/rtree";
import type { LoadedAnimation, FrameEffects } from "#engine/animation-loader";
import type { MovePath } from "#engine/game-object/movement/types";

export type Animations = Record<string, LoadedAnimation>;
export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<string> };

export interface Effects extends FrameEffects {
  speed?: number;
}

export interface DefaultGameObjectOptions {
  movePath?: MovePath;
  effects?: Effects;
}

export type GameObjectOptions =
  { x?: number; y?: number } & DefaultGameObjectOptions |
  { bbox?: BBoxTuple } & DefaultGameObjectOptions;
