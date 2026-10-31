import type { LoadedAnimation } from "#engine/animation-loader";
import type { DefaultBackgroundObjectOptions } from "#engine/game-objects/background-object";

export type { BackgroundFlowRenderState } from "#engine/game-objects/background-flow-object/render";

export type BackgroundFlowDirection = "horizontal" | "vertical";
export type BackgroundFlowOrder = "shuffle" | "random" | "round-robin";
export type BackgroundFlowGap = number | readonly [min: number, max: number];

export interface DefaultBackgroundFlowObjectOptions extends DefaultBackgroundObjectOptions {
  // Спрайты композиции; каждый может быть анимирован. Повторения одного спрайта показывают одинаковый кадр.
  sprites: readonly LoadedAnimation[];

  // Направление размещения спрайтов: слева направо (по умолчанию) или снизу вверх.
  direction?: BackgroundFlowDirection;

  // В каком порядке показывать спрайты: random — случайно с повторами,
  // shuffle — каждый спрайт один раз за цикл, round-robin — по порядку массива.
  order?: BackgroundFlowOrder;

  // Расстояние между спрайтами: число или диапазон для случайного значения.
  gap?: BackgroundFlowGap;

  // Начальное значение генератора случайных чисел; позволяет повторить расположение фона.
  // Если не задано, выбирается случайно при создании объекта.
  seed?: number;
}
