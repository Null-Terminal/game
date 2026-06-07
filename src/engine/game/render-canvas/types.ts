export type RenderPayload = [now: number, ctx: CanvasRenderingContext2D];

export interface RenderCanvasOptions {
  backgroundColor?: string;
  width?: number;
  height?: number;
  showFPS?: boolean;
}
