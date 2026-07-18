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
  maxWidth?: number;
  maxHeight?: number;
  randomDuration?: number[];
}

export interface RequiredAnimationParameters {
  speed: number;
  scale: number;
  opacity: number;
  loopFrom: number;
  loopReverse: boolean;
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
