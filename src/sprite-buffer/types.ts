import type { RenderedSpriteBuffer } from "#sprite-buffer/rendered-sprite-buffer";

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
  data: RenderedSpriteBuffer;
}
