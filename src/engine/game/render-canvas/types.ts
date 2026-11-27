import type { RenderContext } from "#engine/rendering";

export interface RenderPayload {
  now: number;
  delta: number;
  ctx: RenderContext;
}

export interface RenderCanvasOptions {
  backgroundColor?: string;
  width?: number;
  height?: number;
  showFPS?: boolean;
  backend?: "2d" | "webgl";
}
