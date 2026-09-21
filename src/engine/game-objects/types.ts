import type { Handlers } from "#/event-emitter";
import type { BBoxTuple } from "#engine/rtree";

import type { WorldObject, RenderPayload } from "#engine/game";
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

export interface DefaultGameObjectOptions {
  show?: string;
  movement?: { path: MovePath } & MoveAlongPathOptions;

  accept?: Accept | null;
  acceptor?: GameObject | null;

  effects?: Effects;
}

export type GameObjectOptions<T = DefaultGameObjectOptions> =
  { x?: number; y?: number } & T |
  { bbox?: BBoxTuple } & T;

export interface RenderFramePayload extends RenderPayload {
  pattern: boolean;

  frameIndex: number;
  animation: Animations[keyof Animations];

  x: number;
  y: number;

  resolveY(y: number): number;
}

export type RenderFrame = (payload: RenderFramePayload) => void;
