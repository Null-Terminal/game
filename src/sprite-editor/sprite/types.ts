import type { SpriteDescriptor } from "#/sprite-animation";

export type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface SpriteOptions extends Partial<SpriteDescriptor> {
  width: number;
  height: number;

  handleSize?: number;
  handlerColor?: string;

  borderColor?: string;
  backgroundColor?: string;
}
