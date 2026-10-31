import type * as go from "#engine/game-objects/game-object";

export type { StretchTileBounds } from "#engine/game-objects/background-object/debug";
export type { VisibleBounds } from "#engine/game-objects/background-object/render";

type Axis = "w" | "h";
export type AxisFlags = "" | Axis | "wh" | "hw";

export interface BackgroundObjectDebugOptions extends go.GameObjectDebugOptions {
  stretchSeams?: boolean;
}

export interface DefaultBackgroundObjectOptions extends go.DefaultGameObjectOptions {
  stretch?: AxisFlags;
  static?: AxisFlags;
  scrollFactor?: go.ScrollFactor;
  overlay?: boolean;
  debug?: BackgroundObjectDebugOptions;
}
