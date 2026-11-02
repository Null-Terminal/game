export interface Animation {
  sprites: SpriteDescriptor[];
  params?: RawAnimationParameters | undefined;
}

export interface SpriteDescriptor {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
  spriteId: string;
}

export interface OptionalAnimationParameters {
  // Размер, в который вписываются кадры до применения scale
  maxWidth?: number;
  maxHeight?: number;

  // Диапазон случайной длительности кадра в миллисекундах
  randomDuration?: readonly [min: number, max: number];

  // Смещение изображения относительно объекта в пикселях исходного кадра
  visualOffsetX?: number;
  visualOffsetY?: number;
}

export interface RequiredAnimationParameters {
  // Множители скорости воспроизведения и размера кадра
  speed: number;
  scale: number;

  // Прозрачность кадра от 0 до 1
  opacity: number;

  // Кадр, с которого анимация повторяется после завершения
  loopFrom: number;

  // Воспроизведение кадров в обратном порядке после последнего
  loopReverse: boolean;

  // Случайный выбор следующего кадра
  randomOrder: boolean;
}

export interface RawAnimationParameters extends Partial<RequiredAnimationParameters>, OptionalAnimationParameters {}

export interface AnimationParameters extends RequiredAnimationParameters, OptionalAnimationParameters {}

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
