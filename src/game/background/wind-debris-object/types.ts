import type { SeededRandom } from "#/utils/seeded-random";

import type { DefaultGameObjectOptions } from "#engine/game-objects";
import type { LoadedAnimation } from "#engine/animation";

export type WindRange = readonly [min: number, max: number];

export interface WindOptions {
  // Множители скорости между порывами и во время порыва
  calm: number;
  gust: number;

  // Задержки и длительность в миллисекундах
  initialDelay: WindRange;
  pause: WindRange;
  duration: WindRange;

  // Случайная сила порыва
  strength: WindRange;

  // Боковые колебания скорости и их период в миллисекундах
  turbulence: number;
  turbulencePeriod: number;

  // Максимальный шаг симуляции в секундах
  maxDelta: number;
}

export interface WindParticleMotionOptions {
  // Высота над нижним краем мира и масштаб на ближней и дальней границах
  altitude: WindRange;
  depthScale: WindRange;

  // Частота и высота подлёта, период покачивания в миллисекундах
  hopPeriod: number;
  hopCalm: number;
  swayPeriod: number;

  // Отступ при возврате частицы за правый край экрана
  recycleGap: WindRange;
  rightMargin: number;
  boundsMargin: number;
}

export interface WindParticleOptions {
  // Число частиц этого вида на экране
  count: number;

  // Скорость вдоль дороги в пикселях в секунду
  speed: WindRange;

  // Высота подлёта при порыве
  lift: WindRange;

  // Базовый масштаб до поправки на глубину
  scale: WindRange;

  // Амплитуда бокового покачивания и прозрачность
  sway: number;
  opacity: number;
}

export interface TumbleweedOptions extends WindParticleOptions {
  // Радиус качения относительно ширины кадра
  rollRadius: number;
}

export interface NewspaperOptions extends WindParticleOptions {
  // Скорость вращения в радианах в секунду
  spin: WindRange;

  // Вращение без порыва ветра и период переворота в миллисекундах
  spinCalm: number;
  tumblePeriod: number;

  // Высота газеты над дорогой и минимальная прозрачность при перевороте
  groundOffset: number;
  minFlipOpacity: number;
}

export interface WindDebrisSceneOptions {
  // Начальное значение генератора случайных чисел
  seed: number;

  wind: WindOptions;
  motion: WindParticleMotionOptions;

  // Настройки каждого вида частиц
  particles: {
    tumbleweed?: TumbleweedOptions;
    newspaper?: NewspaperOptions;
  };
}

export interface WindDebrisOptions extends DefaultGameObjectOptions, Partial<WindDebrisSceneOptions> {}

export interface WindParticleParams {
  // Анимация, из которой частица берёт текущий кадр
  animation: LoadedAnimation;

  // Данные для начального размещения частицы в видимой области
  random: SeededRandom;
  cameraX: number;
  viewWidth: number;

  // Индивидуальные скорость, подлёт, размер, покачивание и прозрачность
  speed: number;
  lift: number;
  scale: number;
  sway: number;
  opacity: number;

  // Общие настройки ветра и движения частиц
  wind: WindOptions;
  motion: WindParticleMotionOptions;
}

export interface WindParticleSpawnParams<T extends WindParticleOptions> {
  // Общие данные для создания частицы в видимой области
  random: SeededRandom;
  cameraX: number;
  viewWidth: number;

  // Настройки сцены и конкретного вида частицы
  wind: WindOptions;
  motion: WindParticleMotionOptions;
  options: T;
}
