import type { Handlers } from "#/event-emitter";

import type { BBoxTuple } from "#engine/rtree";
import type { WorldObject } from "#engine/game";
import type { LoadedAnimation, FrameEffects } from "#engine/animation-loader";

import type { GameObject } from "#engine/game-objects/game-object";
import type { MovePath, MoveAlongPathOptions } from "#engine/game-objects/movement/types";

export type Animations = Record<string, LoadedAnimation>;
export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<string> };

export type Accept = Record<string, WorldObject>;

export type Refs<T extends Accept> = {
  [K in keyof T]?: InstanceType<T[K][0]> | null;
};

export interface Effects extends FrameEffects {
  speed?: number;
}

export type Axis = "w" | "h";
export type AxisFlags = "" | Axis | `${Axis}${Axis}`;
export type ScrollFactor = [both: number] | [x: number, y: number];

export interface DefaultGameObjectOptions {
  show?: string;
  movement?: { path: MovePath } & MoveAlongPathOptions;

  accept?: Accept | null;
  acceptor?: GameObject | null;

  stretch?: AxisFlags;
  static?: AxisFlags;
  scrollFactor?: ScrollFactor;

  effects?: Effects;
}

export type GameObjectOptions =
  { x?: number; y?: number } & DefaultGameObjectOptions |
  { bbox?: BBoxTuple } & DefaultGameObjectOptions;
