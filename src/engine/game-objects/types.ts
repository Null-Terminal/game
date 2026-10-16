import type { Handlers } from "#/event-emitter";
import type { BBoxTuple } from "#engine/rtree";

import type { RenderPayload } from "#engine/game";
import type { KindedGameObjectCtor } from "#engine/game-object-pool";
import type { LoadedAnimation, FrameEffects } from "#engine/animation-loader";

import type { GameObject } from "#engine/game-objects/game-object";
import type { MovementOptions } from "#engine/game-objects/movement/types";

export type AbstractGameObjectCtor = abstract new (...args: any[]) => GameObject;

export type CreateParameters<T extends AbstractGameObjectCtor = typeof GameObject> =
  Parameters<InstanceType<T>["create"]>;

export type CreateOptionsOf<C extends AbstractGameObjectCtor> =
  NonNullable<CreateParameters<C>[2]>;

export type Animations = Record<string, LoadedAnimation>;
export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<string> };

export type WithEntry = readonly [
  KindedGameObjectCtor<typeof GameObject>,
  (Tb.IntersectionOf<GameObjectOptions> & Record<string, unknown>)?
];

export type WithMap<T = never> = Record<string, WithEntry | ((opts: T) => WithEntry)>;

type ResolveWith<T> = T extends (...args: never[]) => infer R ? R : T;

export type Refs<T extends WithMap> = {
  [K in keyof T]?: ResolveWith<T[K]> extends readonly [infer C extends AbstractGameObjectCtor, ...any]
    ? InstanceType<C> | null
    : never;
};

export type RefOf<O, E> =
  E extends ((options: O) => infer _ extends readonly [infer C extends KindedGameObjectCtor<typeof GameObject>, ...any])
    ? (options: O) => readonly [C, CreateOptionsOf<C>?]
    : E extends (readonly [infer C extends KindedGameObjectCtor<typeof GameObject>, ...any])
      ? readonly [C, CreateOptionsOf<C>?]
      : E;

export interface Effects extends FrameEffects {
  speed?: number;
}

export interface DefaultGameObjectOptions {
  name?: string;
  show?: string;
  movement?: MovementOptions;

  accept?: WithMap | null;
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
