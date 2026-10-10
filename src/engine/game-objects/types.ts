import type { Handlers } from "#/event-emitter";
import type { BBoxTuple } from "#engine/rtree";

import type { RenderPayload } from "#engine/game";
import type { ConcreteGameObjectConstructor  } from "#engine/game-object-pool";
import type { LoadedAnimation, FrameEffects } from "#engine/animation-loader";

import type { GameObject } from "#engine/game-objects/game-object";
import type { MovementOptions } from "#engine/game-objects/movement/types";

export type OptionsOf<C extends abstract new (...args: any) => GameObject> =
  InstanceType<C>["options"];

export type CreateParameters<T extends abstract new (...args: any) => GameObject = typeof GameObject> =
  Parameters<InstanceType<T>["create"]>;

export type Animations = Record<string, LoadedAnimation>;
export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<string> };

export type Accept = Record<string, [
  ConcreteGameObjectConstructor<typeof GameObject>,
  Tb.IntersectionOf<GameObjectOptions> & Record<string, unknown>
]>;

export type Refs<T extends Accept> = {
  [K in keyof T]?: InstanceType<T[K][0]> | null;
};

export interface Effects extends FrameEffects {
  speed?: number;
}

export interface DefaultGameObjectOptions {
  name?: string;
  show?: string;
  movement?: MovementOptions;

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
