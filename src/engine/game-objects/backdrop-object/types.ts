import type { LoadedAnimation } from "#engine/animation-loader";
import type { DefaultBackgroundObjectOptions } from "#engine/game-objects/background-object/types";

export interface BackdropImagePosition {
  index: number;
  x: number;
}

export interface BackdropImage {
  readonly width: number;
}

export type BackdropOrder = "shuffle" | "random" | "round-robin";
export type BackdropGap = number | readonly [min: number, max: number];

export interface BackdropLayoutOptions {
  order?: BackdropOrder;
  gap?: BackdropGap;
  seed: number;
}

export interface DefaultBackdropObjectOptions extends DefaultBackgroundObjectOptions {
  images: readonly LoadedAnimation[];
  // В каком порядке показывать изображения: random — случайно с повторами,
  // shuffle — каждое изображение один раз за цикл, round-robin — по порядку массива
  order?: BackdropOrder;
  // Расстояние между изображениями: либо число, либо пара описывающая диапазон для случайного числа
  gap?: BackdropGap;
  // Начальное значение генератора случайных чисел; позволяет повторить расположение фона.
  // Если не задано, выбирается случайно при создании объекта.
  seed?: number;
}
