import type { SpriteAnimation } from "#/sprite-animation";

export interface SpriteDescriptor {
  x: number;
  y: number;
  width: number;
  height: number;
  animationDelay: number;
  spriteId: string;
}

export interface MergedSprite {
  canvas: HTMLCanvasElement;
  data: SpriteAnimation;
}
