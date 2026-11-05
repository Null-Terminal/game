export interface Animation {
  sprites: SpriteDescriptor[];
  params?: RawAnimationParameters | undefined;
}

export interface SpriteRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteDescriptor extends SpriteRegion {
  duration: number;
  spriteId: string;
}

export interface OptionalAnimationParameters {
  // Размер, в который вписываются кадры до применения scale
  maxWidth?: number;
  maxHeight?: number;

  // Диапазон случайной длительности кадра в миллисекундах
  frameDurationRange?: readonly [min: number, max: number];

  // Область коллизии относительно левого верхнего угла кадра, в пикселях исходника
  // Отступы от краёв применяются и к итоговому bbox при повторении паттерна
  collisionBounds?: SpriteRegion;

  // Области повтора относительно левого верхнего угла кадра, в пикселях исходника
  repeat?: { width?: SpriteRegion; height?: SpriteRegion };
}

export type AnimationOrder = "forward" | "ping-pong" | "random";

export interface DefaultAnimationParameters {
  // Множители скорости воспроизведения и размера кадра
  speed: number;
  scale: number;

  // Прозрачность кадра от 0 до 1
  opacity: number;

  // Кадр, с которого анимация повторяется после завершения
  loopFrom: number;

  // Порядок воспроизведения кадров
  order: AnimationOrder;
}

export interface RawAnimationParameters extends Omit<Partial<DefaultAnimationParameters>, "order">, OptionalAnimationParameters {
  order?: string;
}

export interface AnimationParameters extends DefaultAnimationParameters, OptionalAnimationParameters {}

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
