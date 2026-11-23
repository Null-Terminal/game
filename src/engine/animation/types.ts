import type { Animation, AnimationSound } from "#lib/animation-definition";
import type { LoadedSound } from "#engine/audio";

export type AnimationSounds<T extends Animation> =
  T extends { params: { sounds: infer S extends Record<string, AnimationSound> } } ?
    { readonly [K in keyof S]: LoadedSound } :
    Record<never, LoadedSound>;

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

export interface LoadAnimationOptions<T extends Animation = Animation> {
  sprite?: LoadSpriteOptions;
  animation: Import<T>;
}

export interface FrameEffects {
  opacity?: number;
  scale?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export type SpriteAnchorX = "left" | "center" | "right";
export type SpriteAnchorY = "bottom" | "center" | "top";
