import type { Animation } from "#/sprite-animation";

export type Import<T> = T | Promise<{ default: T }>;

export interface LoadSpriteOptions {
  removeBackground?: boolean | string;
  tolerance?: number;
}

export interface LoadAnimationOptions {
  sprite?: LoadSpriteOptions;
  animation: Import<Animation>;
}
