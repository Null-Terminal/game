import type { Animation } from "#/animation-definition";

export type Import<T> = T | Promise<{ default: T }>;

export interface LoadSpriteOptions {
  removeBackground?: boolean | string;
  tolerance?: number;
}

export interface SpriteLoadData {
  headers: { contentType: string };
  data: ArrayBuffer;
  options: LoadSpriteOptions;
}

export interface LoadAnimationOptions {
  sprite?: LoadSpriteOptions;
  animation: Import<Animation>;
}

export interface FrameEffects {
  opacity?: number;
  scale?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export type SpriteAnchorX = "left" | "center" | "right";
export type SpriteAnchorY = "bottom" | "center" | "top";
