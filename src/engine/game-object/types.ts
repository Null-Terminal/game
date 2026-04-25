import type { Handlers } from "#/event-emitter";
import type { SpriteAnimation } from "#/sprite-animation";

export type Animations = Record<string, [OffscreenCanvas, SpriteAnimation]>;

export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<void> };

export interface GameObjectOptions {
  x?: number;
  y?: number;
  speed?: number;
}
