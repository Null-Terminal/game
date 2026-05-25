import { World, type WorldOptions } from "#engine/game/world";
import type { RenderCanvas } from "#engine/game/render-canvas";

export { World, type WorldOptions };
export { RenderCanvas, type RenderCanvasOptions } from "#engine/game/render-canvas";

export class Game {
  readonly canvas: RenderCanvas;
  readonly world: World;

  constructor(renderCanvas: RenderCanvas, world: WorldOptions) {
    this.canvas = renderCanvas;
    this.world = new World(this, world);
  }
}
