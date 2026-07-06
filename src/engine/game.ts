import { Disposable } from "#engine/disposable";

import { World, type WorldOptions } from "#engine/game/world";
import { Camera } from "#engine/game/camera";

import type { RenderCanvas } from "#engine/game/render-canvas";

export { World, type WorldOptions };
export { RenderCanvas, type RenderCanvasOptions, type RenderPayload } from "#engine/game/render-canvas";

export class Game extends Disposable {
  readonly canvas: RenderCanvas;

  readonly camera: Camera;
  readonly world: World;

  constructor(renderCanvas: RenderCanvas, world: WorldOptions) {
    super();
    this.canvas = renderCanvas;
    this.camera = new Camera(this);
    this.world = new World(this, world);
  }

  override destroy() {
    super.destroy();
    this.canvas.destroy();
    this.world.destroy();
  }
}
