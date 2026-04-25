import type { SpriteAnimation } from "#/sprite-animation";

export type GameObjectAnimations = Record<string, [HTMLCanvasElement, SpriteAnimation]>;

export interface GameObjectOptions {
  x?: number;
  y?: number;
  speed?: number;
}
