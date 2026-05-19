import type { Handlers } from "#/event-emitter";
import type { SpriteAnimation } from "#/sprite-animation";
import type { BBoxTuple } from "#engine/rtree";

export type Animation = [ImageBitmap, SpriteAnimation, CanvasPattern[]?];

export type Animations = Record<string, Animation & {eventName?: string}>;

export type AnimationEvents<T extends Animations> = { [K in keyof T]: Handlers<string> };

export type GameObjectOptions =
  {
    x?: number;
    y?: number;
    speed?: number;
    scale?: number;
  } |

  {
    bbox?: BBoxTuple;
    speed?: number;
    scale?: number;
  };
