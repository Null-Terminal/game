import type { SpriteDescriptor } from "#/sprite-buffer";

export interface SpriteOptions extends Partial<SpriteDescriptor> {
  width: number;
  height: number;

  handleSize?: number;
  handlerColor?: string;

  borderColor?: string;
  backgroundColor?: string;
}
