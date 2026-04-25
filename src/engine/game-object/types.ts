import type { Handlers } from "#/event-emitter";
import type { SpriteAnimation } from "#/sprite-animation";

export type Animations = Record<string, [ImageBitmap, SpriteAnimation] & {eventName?: string}>;

export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<string> };

export interface GameObjectOptions {
  x?: number;
  y?: number;
  speed?: number;
}
