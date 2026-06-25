export interface Animation {
  sprites: SpriteDescriptor[];
  params?: AnimationParameters | undefined;
}

export interface SpriteDescriptor {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
  spriteId: string;
}

export interface AnimationParameters {
  speed: number;
  scale: number;
  loopReverse?: boolean;
  randomOrder?: boolean;
  randomDuration?: number[];
}

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
