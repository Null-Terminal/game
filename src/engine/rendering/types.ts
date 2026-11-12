import type { WebGLCanvasContext } from "#engine/rendering/webgl/context";

export type RenderContext = CanvasRenderingContext2D | WebGLCanvasContext;

export interface RenderStrategy {
  readonly context: RenderContext;
  readonly textureStats?: WebGLCanvasContext["textureStats"];
  destroy(): void;
}
