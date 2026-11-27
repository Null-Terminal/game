import type * as go from "#engine/game-objects/game-object";

export type { RepeatCellBounds } from "#engine/game-objects/background-object/debug";
export type { VisibleBounds } from "#engine/game-objects/background-object/render";

type Axis = "w" | "h";
export type AxisFlags = "" | Axis | "wh" | "hw";

export interface BackgroundObjectDebugOptions extends go.GameObjectDebugOptions {
  stretchSeams?: boolean;
}

export interface DefaultBackgroundObjectOptions extends go.DefaultGameObjectOptions {
  // Оси, по которым фон растягивается до размеров холста
  stretch?: AxisFlags;

  // Оси, по которым фон закреплён на экране и не повторяется
  static?: AxisFlags;

  // Доля смещения камеры по каждой оси
  scrollFactor?: go.ScrollFactor;

  // Если фон рисуется поверх игровой сцены
  overlay?: boolean;

  // Настройки отладки фона, включая швы повторов
  debug?: BackgroundObjectDebugOptions;
}
