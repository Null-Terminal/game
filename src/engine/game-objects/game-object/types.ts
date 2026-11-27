import type { LoadedSound } from "#engine/audio";
import type { EventChannel } from "#lib/event-emitter";

import type { FrameEffects, LoadedAnimation } from "#engine/animation";
import type { KindedGameObjectCtor } from "#engine/game-object-pool";
import type { BBoxTuple } from "#engine/rtree";

import type { GameObject } from "#engine/game-objects/game-object";

import type { GameObjectDebugOptions } from "#engine/game-objects/game-object/debug";
import type { MovementOptions } from "#engine/game-objects/game-object/movement";
import type { ObjectRenderPayload } from "#engine/game-objects/game-object/render";

export type { GameObjectDebugOptions } from "#engine/game-objects/game-object/debug";
export type * from "#engine/game-objects/game-object/movement";
export type * from "#engine/game-objects/game-object/render";

export interface Effects extends FrameEffects {
  speed?: number;
}

export interface DefaultGameObjectOptions {
  // Имя для отладки
  name?: string;

  // Стабильный ID, если порядок создания объекта может меняться
  stateKey?: string;

  // Начальная анимация или её имя
  show?: string | PlayableAnimation;

  // Настройки движения при создании объекта
  movement?: MovementOptions;

  // Может ли объект уходить в сон при удалении от viewport
  sleep?: boolean;

  // Дочерние объекты, которые создаются вместе с этим объектом
  accept?: WithMap | null;

  // Родительский объект в композиции
  acceptor?: GameObject | null;

  // Эффекты отрисовки и скорость анимации
  effects?: Effects;

  // Настройки отладочного отображения
  debug?: GameObjectDebugOptions;
}

export type GameObjectOptions<T = DefaultGameObjectOptions> =
  | { x?: number; y?: number } & T
  | { bbox?: BBoxTuple } & T;

export interface AnimationSoundBank {
  readonly default?: LoadedSound;
  readonly [name: string]: LoadedSound | undefined;
}

export interface AnimationInstance {
  sounds?: AnimationSoundBank;
  draw(frame: ObjectRenderPayload): void;
  advance?(elapsed: number): void;
  destroy?(): void;
}

export type AnimationSource = (go: GameObject) => AnimationInstance;

// Функция вызывается при запуске play, а не на каждом кадре
export type PlayableAnimation = LoadedAnimation | AnimationSource;

export type Animations = Record<string, PlayableAnimation>;
export type AnimationEvents<T extends Animations> = { [K in keyof T]: EventChannel<string> };

export type AbstractGameObjectCtor = abstract new (...args: any[]) => GameObject;

export type CreateParameters<T extends AbstractGameObjectCtor = typeof GameObject> =
  Parameters<InstanceType<T>["create"]>;

export type CreateOptionsOf<C extends AbstractGameObjectCtor> =
  NonNullable<CreateParameters<C>[2]>;

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
  E extends ((opts: O) => infer _ extends readonly [infer C extends KindedGameObjectCtor<typeof GameObject>, ...any])
    ? (opts: O) => readonly [C, CreateOptionsOf<C>?]
    : E extends (readonly [infer C extends KindedGameObjectCtor<typeof GameObject>, ...any])
      ? readonly [C, CreateOptionsOf<C>?]
      : E;
