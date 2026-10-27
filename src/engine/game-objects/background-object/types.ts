import type { DefaultGameObjectOptions, GameObjectDebugOptions } from "#engine/game-objects/types";

export type Axis = "w" | "h";
export type AxisFlags = "" | Axis | "wh" | "hw";
export type ScrollFactor = [both: number] | [x: number, y: number];

export interface BackgroundObjectDebugOptions extends GameObjectDebugOptions {
  stretchSeams?: boolean;
}

export interface DefaultBackgroundObjectOptions extends DefaultGameObjectOptions {
  stretch?: AxisFlags;
  static?: AxisFlags;
  scrollFactor?: ScrollFactor;
  overlay?: boolean;
  debug?: BackgroundObjectDebugOptions;
}

export interface VisibleBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
