import type { SpriteAnimation } from "#/sprite-animation";

export interface SpriteDescriptor {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
  spriteId: string;
}

export interface TexturePacker {
  frames: Record<string, {
    frame: {
      x: number;
      y: number;
      w: number;
      h: number;
    }

    duration: number;
  }>;
}

export interface MergedSprite {
  canvas: HTMLCanvasElement;
  animation: SpriteAnimation;
}
